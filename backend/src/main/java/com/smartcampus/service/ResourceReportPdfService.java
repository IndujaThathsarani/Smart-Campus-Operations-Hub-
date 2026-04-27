package com.smartcampus.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import com.smartcampus.booking.BookingStatus;
import com.smartcampus.model.Booking;
import com.smartcampus.model.Resource;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ResourceRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ResourceReportPdfService {

    private static final List<BookingStatus> ACTIVE_BOOKING_STATUSES = List.of(
            BookingStatus.PENDING,
            BookingStatus.APPROVED
    );

    private static final Font TITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
    private static final Font SUBTITLE_FONT = FontFactory.getFont(FontFactory.HELVETICA, 11);
    private static final Font SECTION_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13);
    private static final Font CARD_LABEL_FONT = FontFactory.getFont(FontFactory.HELVETICA, 10);
    private static final Font CARD_VALUE_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
    private static final Font TABLE_HEADER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
    private static final Font TABLE_BODY_FONT = FontFactory.getFont(FontFactory.HELVETICA, 9);
    private static final Font SMALL_FONT = FontFactory.getFont(FontFactory.HELVETICA, 8);

    private final ResourceRepository resourceRepository;
    private final BookingRepository bookingRepository;

    public ResourceReportPdfService(ResourceRepository resourceRepository, BookingRepository bookingRepository) {
        this.resourceRepository = resourceRepository;
        this.bookingRepository = bookingRepository;
    }

    public byte[] generateResourceManagementReport() throws Exception {
        List<Resource> resources = resourceRepository.findAll();
        List<Booking> bookings = bookingRepository.findAll();

        YearMonth currentMonth = YearMonth.now();
        LocalDate monthStartDate = currentMonth.atDay(1);
        LocalDate monthEndDate = currentMonth.atEndOfMonth();
        LocalDateTime monthStart = monthStartDate.atStartOfDay();
        LocalDateTime monthEndExclusive = monthEndDate.plusDays(1).atStartOfDay();

        List<Booking> activeMonthlyBookings = bookings.stream()
                .filter(this::isActiveBooking)
                .filter(booking -> overlapsRange(booking.getStartTime(), booking.getEndTime(), monthStart, monthEndExclusive))
                .toList();

        Map<String, List<Booking>> monthlyBookingsByResource = activeMonthlyBookings.stream()
                .filter(booking -> booking.getResourceId() != null)
                .collect(Collectors.groupingBy(Booking::getResourceId));

        Map<String, ResourceMetrics> metricsByResource = buildResourceMetrics(
                resources,
                monthlyBookingsByResource,
                monthStartDate,
                monthEndDate
        );

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate(), 26, 26, 36, 38);
        PdfWriter writer = PdfWriter.getInstance(document, outputStream);

        String generatedAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        writer.setPageEvent(new FooterPageEvent(generatedAt));

        document.open();

        addHeaderSection(document);
        addSummaryCardsSection(document, resources, activeMonthlyBookings.size());
        addAvailableResourcesSection(document, resources, metricsByResource);
        addLowUtilizationSection(document, resources, metricsByResource);
        addOutOfServiceSection(document, resources, metricsByResource);
        addCategorySummarySection(document, resources, metricsByResource);

        document.close();
        return outputStream.toByteArray();
    }

    private void addHeaderSection(Document document) throws Exception {
        Paragraph title = new Paragraph("Resource Management Report", TITLE_FONT);
        title.setAlignment(Element.ALIGN_LEFT);
        document.add(title);

        Paragraph subtitle = new Paragraph(
                "Operational summary of campus facilities, resource utilization, and availability status",
                SUBTITLE_FONT
        );
        subtitle.setSpacingBefore(4f);
        subtitle.setSpacingAfter(16f);
        subtitle.setAlignment(Element.ALIGN_LEFT);
        document.add(subtitle);
    }

    private void addSummaryCardsSection(Document document, List<Resource> resources, int monthlyBookingsCount) throws Exception {
        long totalResources = resources.size();
        long activeResources = resources.stream().filter(resource -> "ACTIVE".equalsIgnoreCase(resource.getStatus())).count();
        long outOfServiceResources = resources.stream().filter(resource -> "OUT_OF_SERVICE".equalsIgnoreCase(resource.getStatus())).count();

        PdfPTable cardsTable = new PdfPTable(4);
        cardsTable.setWidthPercentage(100f);
        cardsTable.setSpacingAfter(14f);
        cardsTable.setWidths(new float[]{1f, 1f, 1f, 1f});

        cardsTable.addCell(buildSummaryCard("\u25A0", "Total Resources", String.valueOf(totalResources), new java.awt.Color(30, 64, 175)));
        cardsTable.addCell(buildSummaryCard("\u25CF", "Active Resources", String.valueOf(activeResources), new java.awt.Color(22, 163, 74)));
        cardsTable.addCell(buildSummaryCard("\u25B2", "Out of Service", String.valueOf(outOfServiceResources), new java.awt.Color(220, 38, 38)));
        cardsTable.addCell(buildSummaryCard("\u25C6", "Total Bookings (Month)", String.valueOf(monthlyBookingsCount), new java.awt.Color(79, 70, 229)));

        document.add(cardsTable);
    }

    private PdfPCell buildSummaryCard(String icon, String label, String value, java.awt.Color accentColor) {
        PdfPCell cardCell = new PdfPCell();
        cardCell.setPadding(10f);
        cardCell.setBorderColor(new java.awt.Color(203, 213, 225));
        cardCell.setBackgroundColor(new java.awt.Color(248, 250, 252));

        Phrase iconLine = new Phrase(icon + "  " + label, CARD_LABEL_FONT);
        Paragraph labelParagraph = new Paragraph(iconLine);
        labelParagraph.getFont().setColor(accentColor);
        labelParagraph.setSpacingAfter(8f);

        Paragraph valueParagraph = new Paragraph(value, CARD_VALUE_FONT);
        valueParagraph.getFont().setColor(accentColor);

        cardCell.addElement(labelParagraph);
        cardCell.addElement(valueParagraph);
        return cardCell;
    }

    private void addAvailableResourcesSection(Document document, List<Resource> resources, Map<String, ResourceMetrics> metricsByResource) throws Exception {
        Paragraph sectionTitle = new Paragraph("Available Resources", SECTION_FONT);
        sectionTitle.setSpacingBefore(2f);
        sectionTitle.setSpacingAfter(8f);
        document.add(sectionTitle);

        PdfPTable table = new PdfPTable(8);
        table.setWidthPercentage(100f);
        table.setSpacingAfter(12f);
        table.setWidths(new float[]{1.2f, 2.4f, 1.8f, 2.2f, 1.2f, 1.3f, 1.5f, 1.5f});

        addHeaderRow(table,
                "Resource ID",
                "Name",
                "Type",
                "Location",
                "Capacity",
                "Status",
                "Current Bookings",
                "Utilization"
        );

        List<Resource> activeResources = resources.stream()
                .filter(resource -> "ACTIVE".equalsIgnoreCase(resource.getStatus()))
                .sorted(Comparator.comparing(resource -> safe(resource.getName())))
                .toList();

        if (activeResources.isEmpty()) {
            addEmptyTableRow(table, 8, "No active resources available.");
        } else {
            int rowIndex = 0;
            for (Resource resource : activeResources) {
                ResourceMetrics metrics = metricsByResource.getOrDefault(resource.getId(), ResourceMetrics.empty());
                java.awt.Color rowColor = rowIndex % 2 == 0
                        ? new java.awt.Color(255, 255, 255)
                        : new java.awt.Color(248, 250, 252);
                rowIndex++;

                addBodyCell(table, safe(resource.getId()), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, safe(resource.getName()), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, formatType(resource), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, safe(resource.getLocation()), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, String.valueOf(resource.getCapacity() == null ? 0 : resource.getCapacity()), Element.ALIGN_RIGHT, rowColor);
                addBodyCell(table, safe(resource.getStatus()), Element.ALIGN_CENTER, rowColor);
                addBodyCell(table, String.valueOf(metrics.bookingCount()), Element.ALIGN_CENTER, rowColor);
                addBodyCell(table, formatPercent(metrics.utilizationRate()), Element.ALIGN_RIGHT, rowColor);
            }
        }

        document.add(table);
    }

    private void addLowUtilizationSection(Document document, List<Resource> resources, Map<String, ResourceMetrics> metricsByResource) throws Exception {
        Paragraph sectionTitle = new Paragraph("Low Utilization Alerts (< 30%)", SECTION_FONT);
        sectionTitle.setSpacingBefore(2f);
        sectionTitle.setSpacingAfter(8f);
        document.add(sectionTitle);

        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100f);
        table.setSpacingAfter(12f);
        table.setWidths(new float[]{1.4f, 2.4f, 1.8f, 1.4f, 1.4f, 1.6f});

        addHeaderRow(table,
                "Resource ID",
                "Name",
                "Category",
                "Bookings",
                "Available Hours",
                "Utilization"
        );

        List<Resource> lowUtilizationResources = resources.stream()
                .filter(resource -> "ACTIVE".equalsIgnoreCase(resource.getStatus()))
                .filter(resource -> {
                    ResourceMetrics metrics = metricsByResource.getOrDefault(resource.getId(), ResourceMetrics.empty());
                    return metrics.availableHours() > 0 && metrics.utilizationRate() < 30.0;
                })
                .sorted(Comparator.comparingDouble(resource -> metricsByResource.get(resource.getId()).utilizationRate()))
                .toList();

        if (lowUtilizationResources.isEmpty()) {
            addEmptyTableRow(table, 6, "No low-utilization alerts for the current month.");
        } else {
            int rowIndex = 0;
            for (Resource resource : lowUtilizationResources) {
                ResourceMetrics metrics = metricsByResource.getOrDefault(resource.getId(), ResourceMetrics.empty());
                java.awt.Color rowColor = rowIndex % 2 == 0
                        ? new java.awt.Color(255, 255, 255)
                        : new java.awt.Color(248, 250, 252);
                rowIndex++;

                addBodyCell(table, safe(resource.getId()), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, safe(resource.getName()), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, formatType(resource), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, String.valueOf(metrics.bookingCount()), Element.ALIGN_CENTER, rowColor);
                addBodyCell(table, formatDecimal(metrics.availableHours()), Element.ALIGN_RIGHT, rowColor);
                addBodyCell(table, formatPercent(metrics.utilizationRate()), Element.ALIGN_RIGHT, rowColor);
            }
        }

        document.add(table);
    }

    private void addOutOfServiceSection(Document document, List<Resource> resources, Map<String, ResourceMetrics> metricsByResource) throws Exception {
        Paragraph sectionTitle = new Paragraph("Out of Service Resources", SECTION_FONT);
        sectionTitle.setSpacingBefore(2f);
        sectionTitle.setSpacingAfter(8f);
        document.add(sectionTitle);

        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100f);
        table.setSpacingAfter(12f);
        table.setWidths(new float[]{1.5f, 2.5f, 2f, 2.2f, 1.5f});

        addHeaderRow(table,
                "Resource ID",
                "Name",
                "Category",
                "Location",
                "Current Bookings"
        );

        List<Resource> outOfServiceResources = resources.stream()
                .filter(resource -> "OUT_OF_SERVICE".equalsIgnoreCase(resource.getStatus()))
                .sorted(Comparator.comparing(resource -> safe(resource.getName())))
                .toList();

        if (outOfServiceResources.isEmpty()) {
            addEmptyTableRow(table, 5, "No resources are currently out of service.");
        } else {
            int rowIndex = 0;
            for (Resource resource : outOfServiceResources) {
                ResourceMetrics metrics = metricsByResource.getOrDefault(resource.getId(), ResourceMetrics.empty());
                java.awt.Color rowColor = rowIndex % 2 == 0
                        ? new java.awt.Color(255, 255, 255)
                        : new java.awt.Color(248, 250, 252);
                rowIndex++;

                addBodyCell(table, safe(resource.getId()), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, safe(resource.getName()), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, formatType(resource), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, safe(resource.getLocation()), Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, String.valueOf(metrics.bookingCount()), Element.ALIGN_CENTER, rowColor);
            }
        }

        document.add(table);
    }

    private void addCategorySummarySection(Document document, List<Resource> resources, Map<String, ResourceMetrics> metricsByResource) throws Exception {
        Paragraph sectionTitle = new Paragraph("Category-Wise Summary", SECTION_FONT);
        sectionTitle.setSpacingBefore(2f);
        sectionTitle.setSpacingAfter(8f);
        document.add(sectionTitle);

        PdfPTable table = new PdfPTable(5);
        table.setWidthPercentage(100f);
        table.setSpacingAfter(8f);
        table.setWidths(new float[]{2.2f, 1.4f, 1.4f, 1.5f, 1.5f});

        addHeaderRow(table,
                "Category",
                "Total Resources",
                "Active Resources",
                "Utilization Rate",
                "Total Bookings"
        );

        Map<String, List<Resource>> byCategory = resources.stream()
                .collect(Collectors.groupingBy(this::formatType));

        List<String> categories = new ArrayList<>(byCategory.keySet());
        categories.sort(String::compareToIgnoreCase);

        if (categories.isEmpty()) {
            addEmptyTableRow(table, 5, "No category data available.");
        } else {
            int rowIndex = 0;
            for (String category : categories) {
                List<Resource> categoryResources = byCategory.getOrDefault(category, List.of());

                int totalResources = categoryResources.size();
                int activeResources = (int) categoryResources.stream()
                        .filter(resource -> "ACTIVE".equalsIgnoreCase(resource.getStatus()))
                        .count();

                int totalBookings = categoryResources.stream()
                        .map(resource -> metricsByResource.getOrDefault(resource.getId(), ResourceMetrics.empty()).bookingCount())
                        .reduce(0, Integer::sum);

                double bookedHours = categoryResources.stream()
                        .map(resource -> metricsByResource.getOrDefault(resource.getId(), ResourceMetrics.empty()).bookedHours())
                        .reduce(0.0, Double::sum);

                double availableHours = categoryResources.stream()
                        .map(resource -> metricsByResource.getOrDefault(resource.getId(), ResourceMetrics.empty()).availableHours())
                        .reduce(0.0, Double::sum);

                double utilizationRate = availableHours > 0 ? (bookedHours / availableHours) * 100.0 : 0.0;

                java.awt.Color rowColor = rowIndex % 2 == 0
                        ? new java.awt.Color(255, 255, 255)
                        : new java.awt.Color(248, 250, 252);
                rowIndex++;

                addBodyCell(table, category, Element.ALIGN_LEFT, rowColor);
                addBodyCell(table, String.valueOf(totalResources), Element.ALIGN_CENTER, rowColor);
                addBodyCell(table, String.valueOf(activeResources), Element.ALIGN_CENTER, rowColor);
                addBodyCell(table, formatPercent(utilizationRate), Element.ALIGN_RIGHT, rowColor);
                addBodyCell(table, String.valueOf(totalBookings), Element.ALIGN_CENTER, rowColor);
            }
        }

        document.add(table);
    }

    private Map<String, ResourceMetrics> buildResourceMetrics(
            List<Resource> resources,
            Map<String, List<Booking>> monthlyBookingsByResource,
            LocalDate monthStart,
            LocalDate monthEnd
    ) {
        Map<String, ResourceMetrics> metricsByResource = new HashMap<>();

        for (Resource resource : resources) {
            List<Booking> resourceBookings = monthlyBookingsByResource.getOrDefault(resource.getId(), List.of());

            double bookedHours = resourceBookings.stream()
                    .map(booking -> overlapHours(
                            booking.getStartTime(),
                            booking.getEndTime(),
                            monthStart.atStartOfDay(),
                            monthEnd.plusDays(1).atStartOfDay()
                    ))
                    .reduce(0.0, Double::sum);

            double availableHours = computeMonthlyAvailableHours(resource, monthStart, monthEnd);
            int bookingCount = resourceBookings.size();
            double utilizationRate = availableHours > 0 ? (bookedHours / availableHours) * 100.0 : 0.0;

            metricsByResource.put(
                    resource.getId(),
                    new ResourceMetrics(bookingCount, bookedHours, availableHours, utilizationRate)
            );
        }

        return metricsByResource;
    }

    private double computeMonthlyAvailableHours(Resource resource, LocalDate monthStart, LocalDate monthEnd) {
        if (resource == null || resource.getAvailabilityStart() == null || resource.getAvailabilityEnd() == null) {
            return 0.0;
        }

        LocalTime startTime;
        LocalTime endTime;
        try {
            startTime = LocalTime.parse(resource.getAvailabilityStart());
            endTime = LocalTime.parse(resource.getAvailabilityEnd());
        } catch (Exception ex) {
            return 0.0;
        }

        if (!startTime.isBefore(endTime)) {
            return 0.0;
        }

        LocalDate effectiveStart = monthStart;
        LocalDate effectiveEnd = monthEnd;

        if (resource.getAvailabilityStartDate() != null && !resource.getAvailabilityStartDate().isBlank()) {
            try {
                effectiveStart = LocalDate.parse(resource.getAvailabilityStartDate()).isAfter(effectiveStart)
                        ? LocalDate.parse(resource.getAvailabilityStartDate())
                        : effectiveStart;
            } catch (Exception ignored) {
                // Ignore malformed availability start date.
            }
        }

        if (resource.getAvailabilityEndDate() != null && !resource.getAvailabilityEndDate().isBlank()) {
            try {
                effectiveEnd = LocalDate.parse(resource.getAvailabilityEndDate()).isBefore(effectiveEnd)
                        ? LocalDate.parse(resource.getAvailabilityEndDate())
                        : effectiveEnd;
            } catch (Exception ignored) {
                // Ignore malformed availability end date.
            }
        }

        if (effectiveStart.isAfter(effectiveEnd)) {
            return 0.0;
        }

        double dailyHours = Duration.between(startTime, endTime).toMinutes() / 60.0;
        long dayCount = Duration.between(effectiveStart.atStartOfDay(), effectiveEnd.plusDays(1).atStartOfDay()).toDays();

        return dailyHours * Math.max(dayCount, 0);
    }

    private boolean overlapsRange(LocalDateTime start, LocalDateTime end, LocalDateTime rangeStart, LocalDateTime rangeEndExclusive) {
        if (start == null || end == null) {
            return false;
        }
        return start.isBefore(rangeEndExclusive) && end.isAfter(rangeStart);
    }

    private double overlapHours(LocalDateTime start, LocalDateTime end, LocalDateTime rangeStart, LocalDateTime rangeEndExclusive) {
        if (!overlapsRange(start, end, rangeStart, rangeEndExclusive)) {
            return 0.0;
        }

        LocalDateTime effectiveStart = start.isAfter(rangeStart) ? start : rangeStart;
        LocalDateTime effectiveEnd = end.isBefore(rangeEndExclusive) ? end : rangeEndExclusive;
        return Duration.between(effectiveStart, effectiveEnd).toMinutes() / 60.0;
    }

    private boolean isActiveBooking(Booking booking) {
        if (booking == null || booking.getStatus() == null) {
            return false;
        }
        return ACTIVE_BOOKING_STATUSES.contains(booking.getStatus());
    }

    private String formatType(Resource resource) {
        if (resource == null || resource.getType() == null) {
            return "UNKNOWN";
        }
        return resource.getType().name().replace('_', ' ');
    }

    private void addHeaderRow(PdfPTable table, String... headers) {
        for (String header : headers) {
            PdfPCell headerCell = new PdfPCell(new Phrase(header, TABLE_HEADER_FONT));
            headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            headerCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            headerCell.setPadding(6f);
            headerCell.setBackgroundColor(new java.awt.Color(30, 41, 59));
            headerCell.setBorderColor(new java.awt.Color(148, 163, 184));
            headerCell.setPhrase(new Phrase(header, TABLE_HEADER_FONT));
            headerCell.getPhrase().getFont().setColor(java.awt.Color.WHITE);
            table.addCell(headerCell);
        }
    }

    private void addBodyCell(PdfPTable table, String value, int alignment, java.awt.Color rowColor) {
        PdfPCell cell = new PdfPCell(new Phrase(value, TABLE_BODY_FONT));
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(5f);
        cell.setBackgroundColor(rowColor);
        cell.setBorderColor(new java.awt.Color(226, 232, 240));
        table.addCell(cell);
    }

    private void addEmptyTableRow(PdfPTable table, int colSpan, String text) {
        PdfPCell empty = new PdfPCell(new Phrase(text, TABLE_BODY_FONT));
        empty.setColspan(colSpan);
        empty.setHorizontalAlignment(Element.ALIGN_CENTER);
        empty.setVerticalAlignment(Element.ALIGN_MIDDLE);
        empty.setPadding(8f);
        empty.setBackgroundColor(new java.awt.Color(248, 250, 252));
        empty.setBorderColor(new java.awt.Color(226, 232, 240));
        table.addCell(empty);
    }

    private String formatPercent(double value) {
        return String.format(Locale.US, "%.1f%%", Math.max(value, 0.0));
    }

    private String formatDecimal(double value) {
        return String.format(Locale.US, "%.1f", Math.max(value, 0.0));
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private record ResourceMetrics(int bookingCount, double bookedHours, double availableHours, double utilizationRate) {
        private static ResourceMetrics empty() {
            return new ResourceMetrics(0, 0.0, 0.0, 0.0);
        }
    }

    private static class FooterPageEvent extends PdfPageEventHelper {
        private final String generatedAt;

        private FooterPageEvent(String generatedAt) {
            this.generatedAt = generatedAt;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContent();
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 8);

            float y = document.bottom() - 12;
            ColumnText.showTextAligned(
                    canvas,
                    Element.ALIGN_LEFT,
                    new Phrase("Generated on " + generatedAt, footerFont),
                    document.left(),
                    y,
                    0
            );
            ColumnText.showTextAligned(
                    canvas,
                    Element.ALIGN_RIGHT,
                    new Phrase("Page " + writer.getPageNumber(), footerFont),
                    document.right(),
                    y,
                    0
            );
        }
    }
}
