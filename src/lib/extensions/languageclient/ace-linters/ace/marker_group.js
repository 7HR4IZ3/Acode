"use strict";
export class MarkerGroup {
    markers;
    session;
    MAX_MARKERS = 10000;
    constructor(session) {
        this.markers = [];
        this.session = session;
        session.addDynamicMarker(this);
    }
    getMarkerAtPosition(pos) {
        return this.markers.find(function (marker) {
            return marker.range.contains(pos.row, pos.column);
        });
    }
    markersComparator(a, b) {
        return a.range.start.row - b.range.start.row;
    }
    setMarkers(markers) {
        this.markers = markers.sort(this.markersComparator).slice(0, this.MAX_MARKERS);
        this.session._signal("changeBackMarker");
    }
    update(html, markerLayer, session, config) {
        if (!this.markers || !this.markers.length)
            return;
        var visibleRangeStartRow = config.firstRow, visibleRangeEndRow = config.lastRow;
        var foldLine;
        var markersOnOneLine = 0;
        var lastRow = 0;
        for (var i = 0; i < this.markers.length; i++) {
            var marker = this.markers[i];
            if (marker.range.end.row < visibleRangeStartRow)
                continue;
            if (marker.range.start.row > visibleRangeEndRow)
                continue;
            if (marker.range.start.row === lastRow) {
                markersOnOneLine++;
            }
            else {
                lastRow = marker.range.start.row;
                markersOnOneLine = 0;
            }
            if (markersOnOneLine > 200) {
                continue;
            }
            var markerVisibleRange = marker.range.clipRows(visibleRangeStartRow, visibleRangeEndRow);
            if (markerVisibleRange.start.row === markerVisibleRange.end.row
                && markerVisibleRange.start.column === markerVisibleRange.end.column) {
                continue;
            }
            var screenRange = markerVisibleRange.toScreenRange(session);
            if (screenRange.isEmpty()) {
                foldLine = session.getNextFoldLine(markerVisibleRange.end.row, foldLine);
                if (foldLine && foldLine.end.row > markerVisibleRange.end.row) {
                    visibleRangeStartRow = foldLine.end.row;
                }
                continue;
            }
            if (screenRange.isMultiLine()) {
                markerLayer.drawTextMarker(html, screenRange, marker.className, config);
            }
            else {
                markerLayer.drawSingleLineMarker(html, screenRange, marker.className, config);
            }
        }
    }
}
