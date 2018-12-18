import { addClass, addClasses, clearNode, disableSelection, getscrollbarDimensions, hide, maxSupportedCssHeight, removeClass } from './core/dom';
import { Event, EventData } from './core/event';
import { DataView } from './dataView';

export class Grid {

  // scroller
  th;   // virtual height
  h;    // real scrollable height
  ph;   // page height
  n;    // number of pages
  cj;   // "jumpiness" coefficient

  page = 0;       // current page
  offset = 0;     // current page offset
  vScrollDir = 1;

  // private
  initialized = false;
  $container: HTMLElement;
  uid: string = 'slickgrid_' + Math.round(1000000 * Math.random());

  $headerScroller: HTMLElement;
  $headers: HTMLElement;
  $headerRow: HTMLElement;
  $headerRowScroller: HTMLElement;
  $headerRowSpacer: HTMLElement;
  $footerRow: HTMLElement;
  $footerRowScroller: HTMLElement;
  $footerRowSpacer: HTMLElement;
  $preHeaderPanel: HTMLElement;
  $preHeaderPanelScroller: HTMLElement;
  $preHeaderPanelSpacer: HTMLElement;
  $topPanelScroller: HTMLElement;
  $topPanel: HTMLElement;
  $viewport: HTMLElement;
  $canvas: HTMLElement;
  $style: HTMLStyleElement;
  $boundAncestors: HTMLElement;

  stylesheet;
  columnCssRulesL;
  columnCssRulesR;
  viewportH: number;
  viewportW: number;
  canvasWidth;
  viewportHasHScroll: boolean;
  viewportHasVScroll: boolean;
  headerColumnWidthDiff = 0;
  headerColumnHeightDiff = 0; // border+padding
  cellWidthDiff = 0;
  cellHeightDiff = 0;
  jQueryNewWidthBehaviour = false;
  absoluteColumnMinWidth;

  tabbingDirection = 1;
  activePosX;
  activeRow;

  activeCell;
  activeCellNode = null;
  currentEditor = null;
  serializedEditorValue;
  editController;

  rowsCache = {};
  renderedRows = 0;
  numVisibleRows;
  prevScrollTop = 0;
  scrollTop = 0;
  lastRenderedScrollTop = 0;
  lastRenderedScrollLeft = 0;
  prevScrollLeft = 0;
  scrollLeft = 0;

  selectionModel;
  selectedRows = [];

  plugins = [];
  cellCssClasses = {};

  columnsById = {};
  sortColumns = [];
  columnPosLeft = [];
  columnPosRight = [];

  pagingActive = false;
  pagingIsLastPage = false;

  // async call handles
  h_editorLoader = null;
  h_render: number;
  h_postrender = null;
  h_postrenderCleanup = null;
  postProcessedRows = {};
  postProcessToRow = null;
  postProcessFromRow = null;
  postProcessedCleanupQueue: Array<{
    node: HTMLElement
    actionType: string,
    groupId: number,
    columnIdx?: number
    rowIdx?: number
  }> = [];
  postProcessgroupId = 0;

  // perf counters
  counter_rows_rendered = 0;
  counter_rows_removed = 0;

  // These two variables work around a bug with inertial scrolling in Webkit/Blink on Mac.
  // See http://crbug.com/312427.
  rowNodeFromLastMouseWheelEvent;  // this node must not be deleted while inertial scrolling
  zombieRowNodeFromLastMouseWheelEvent;  // node that was hidden instead of getting deleted
  zombieRowCacheFromLastMouseWheelEvent;  // row cache for above node
  zombieRowPostProcessedFromLastMouseWheelEvent;  // post processing references for above node

  // store css attributes if display:none is active in container or parent
  cssShow = { position: 'absolute', visibility: 'hidden', display: 'block' };
  $hiddenParents;
  columnResizeDragging = false;

  columnDefaults: any;
  options: any;
  scrollbarDimensions: { width: number, height: number };
  columns: any;

  // Events
  onScroll = new Event();
  onSort = new Event();
  onHeaderMouseEnter = new Event();
  onHeaderMouseLeave = new Event();
  onHeaderContextMenu = new Event();
  onHeaderClick = new Event();
  onHeaderCellRendered = new Event();
  onBeforeHeaderCellDestroy = new Event();
  onHeaderRowCellRendered = new Event();
  onFooterRowCellRendered = new Event();
  onBeforeHeaderRowCellDestroy = new Event();
  onBeforeFooterRowCellDestroy = new Event();
  onMouseEnter = new Event();
  onMouseLeave = new Event();
  onClick = new Event();
  onDblClick = new Event();
  onContextMenu = new Event();
  onKeyDown = new Event();
  onAddNewRow = new Event();
  onBeforeAppendCell = new Event();
  onValidationError = new Event();
  onViewportChanged = new Event();
  onColumnsReordered = new Event();
  onColumnsResized = new Event();
  onCellChange = new Event();
  onBeforeEditCell = new Event();
  onBeforeCellEditorDestroy = new Event();
  onBeforeDestroy = new Event();
  onActiveCellChanged = new Event();
  onActiveCellPositionChanged = new Event();
  onDragInit = new Event();
  onDragStart = new Event();
  onDrag = new Event();
  onDragEnd = new Event();
  onSelectedRowsChanged = new Event();
  onCellCssStylesChanged = new Event();

  data: DataView;

  constructor(container: HTMLElement, data, columns, options) {
    // settings
    let defaults = {
      alwaysShowVerticalScroll: false,
      explicitInitialization: false,
      rowHeight: 25,
      defaultColumnWidth: 80,
      enableAddRow: false,
      leaveSpaceForNewRows: false,
      editable: false,
      autoEdit: true,
      enableCellNavigation: true,
      enableColumnReorder: true,
      asyncEditorLoading: false,
      asyncEditorLoadDelay: 100,
      forceFitColumns: false,
      enableAsyncPostRender: false,
      asyncPostRenderDelay: 50,
      enableAsyncPostRenderCleanup: false,
      asyncPostRenderCleanupDelay: 40,
      autoHeight: false,
      showHeaderRow: false,
      headerRowHeight: 25,
      createFooterRow: false,
      showFooterRow: false,
      footerRowHeight: 25,
      createPreHeaderPanel: false,
      showPreHeaderPanel: false,
      preHeaderPanelHeight: 25,
      showTopPanel: false,
      topPanelHeight: 25,
      formatterFactory: null,
      editorFactory: null,
      cellFlashingCssClass: 'flashing',
      selectedCellCssClass: 'selected',
      multiSelect: true,
      enableTextSelectionOnCells: false,
      dataItemColumnValueExtractor: null,
      fullWidthRows: false,
      multiColumnSort: false,
      numberedMultiColumnSort: false,
      tristateMultiColumnSort: false,
      sortColNumberInSeparateSpan: false,
      forceSyncScrolling: false,
      addNewRowCssClass: 'new-row',
      preserveCopiedSelectionOnPaste: false,
      showCellSelection: true,
      viewportClass: null,
      minRowBuffer: 3,
      emulatePagingWhenScrolling: true, // when scrolling off bottom of viewport, place new row at top of viewport
      editorCellNavOnLRKeys: false
    };

    this.columnDefaults = {
      name: '',
      resizable: true,
      sortable: false,
      minWidth: 30,
      rerenderOnResize: false,
      headerCssClass: null,
      defaultSortAsc: true,
      focusable: true,
      selectable: true
    };

    this.$container = container;

    this.columns = columns;
    this.data = data;
    this.options = { ...defaults, ...options };

    this.validateAndEnforceOptions();

    this.columnDefaults.width = options.defaultColumnWidth;

    this.columnsById = {};

    for (let i = 0; i < columns.length; i++) {
      let m = columns[i] = { ...this.columnDefaults, ...columns[i] };
      this.columnsById[m.id] = i;
      if (m.minWidth && m.width < m.minWidth) {
        m.width = m.minWidth;
      }
      if (m.maxWidth && m.width > m.maxWidth) {
        m.width = m.maxWidth;
      }
    }

    clearNode(this.$container);

    this.$container.style.overflow = 'hidden';
    this.$container.style.outline = '0';

    addClasses(this.$container, this.uid, 'ui-widget');

    // set up a positioning container if needed
    if (!/relative|absolute|fixed/.test(this.$container.style.position)) {
      this.$container.style.position = 'relative';
    }

    this.$headerScroller = document.createElement('div');
    addClasses(this.$headerScroller, 'slick-header', 'ui-state-default');
    this.$container.appendChild(this.$headerScroller);

    this.$headers = document.createElement('div');
    addClass(this.$headers, 'slick-header-columns');
    this.$headers.style.left = '-1000px';
    this.$container.appendChild(this.$headers);

    this.$headerRowScroller = document.createElement('div');
    addClasses(this.$headerRowScroller, 'slick-headerrow', 'ui-state-default');
    this.$container.appendChild(this.$headerRowScroller);

    this.$headerRow = document.createElement('div');
    addClass(this.$headerRow, 'slick-headerrow-columns');
    this.$headerRowScroller.appendChild(this.$headerRow);

    this.$headerRowSpacer = document.createElement('div');
    addClass(this.$headerRow, 'slick-headerrow-spacer');
    this.$headerRowScroller.appendChild(this.$headerRowSpacer);

    if (!options.showHeaderRow) {
      hide(this.$headerRowScroller);
    }

    this.$viewport = document.createElement('div');
    addClass(this.$viewport, 'slick-viewport');
    this.$container.appendChild(this.$viewport);
    this.$viewport.style.overflowX = options.forceFitColumns ? 'hidden' : 'auto';
    this.$viewport.style.overflowY = options.alwaysShowVerticalScroll ? 'scroll' : (options.autoHeight ? 'hidden' : 'auto');

    if (options.viewportClass) {
      addClasses(this.$viewport, options.viewportClass);
    }

    this.$canvas = document.createElement('div');
    addClass(this.$canvas, 'grid-canvas');
    this.$viewport.appendChild(this.$canvas);

    this.scrollbarDimensions = getscrollbarDimensions(this.$viewport);

    this.$headers.style.width = this.getHeadersWidth() + 'px';
    this.$headerRowSpacer.style.width = this.getCanvasWidth() + this.scrollbarDimensions.width + 'px';

    if (!options.explicitInitialization) {
      this.init();
    }
  }

  validateAndEnforceOptions() {
    if (this.options.autoHeight) {
      this.options.leaveSpaceForNewRows = false;
    }
  }

  getHeadersWidth() {
    let headersWidth = this.getColumnTotalWidth(!this.options.autoHeight);
    return Math.max(headersWidth, this.viewportW) + 1000;
  }

  getColumnTotalWidth(includeScrollbar) {
    let totalWidth = 0;
    for (let i = 0, ii = this.columns.length; i < ii; i++) {
      let width = this.columns[i].width;
      totalWidth += width;
    }
    if (includeScrollbar) {
      totalWidth += this.scrollbarDimensions.width;
    }
    return totalWidth;
  }

  getCanvasWidth() {
    let availableWidth = this.viewportHasVScroll ? this.viewportW - this.scrollbarDimensions.width : this.viewportW;
    let rowWidth = 0;
    let i = this.columns.length;
    while (i--) {
      rowWidth += this.columns[i].width;
    }
    return this.options.fullWidthRows ? Math.max(rowWidth, availableWidth) : rowWidth;
  }

  public init() {
    if (!this.initialized) {
      this.initialized = true;

      this.viewportW = this.$container.clientWidth;

      // header columns and cells may have different padding/border skewing width calculations (box-sizing, hello?)
      // calculate the diff so we can set consistent sizes
      this.measureCellPaddingAndBorder();

      // for usability reasons, all text selection in SlickGrid is disabled
      // with the exception of input and textarea elements (selection must
      // be enabled there so that editors work as expected); note that
      // selection in grid cells (grid body) is already unavailable in
      // all browsers except IE
      disableSelection(this.$headers); // disable all text selection in header (including input and textarea)

      this.updateColumnCaches();
      this.createColumnHeaders();
      this.createCssRules();
      this.resizeCanvas();

      this.$viewport.addEventListener('scroll', this.handleScroll.bind(this));
    }
  }

  measureCellPaddingAndBorder() {
    let h = ['borderLeftWidth', 'borderRightWidth', 'paddingLeft', 'paddingRight'];
    let v = ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'];

    let el = document.createElement('div');
    addClass(el, 'slick-header-column');
    el.style.visibility = 'hidden';
    this.$headers.appendChild(el);

    this.headerColumnWidthDiff = this.headerColumnHeightDiff = 0;
    if (el.style.boxSizing !== 'border-box') {
      h.forEach(a => {
        this.headerColumnWidthDiff += parseFloat(el.style[a]) || 0;
      });
      v.forEach(a => {
        this.headerColumnHeightDiff += parseFloat(el.style[a]) || 0;
      });
    }

    el.remove();

    let r = document.createElement('div');
    addClass(r, 'slick-row');

    el = document.createElement('div');
    addClass(el, 'slick-cell');
    el.style.visibility = 'hidden';
    r.appendChild(el);
    this.$canvas.appendChild(r);

    this.cellWidthDiff = this.cellHeightDiff = 0;

    if (el.style.boxSizing !== 'border-box') {
      h.forEach(a => {
        this.cellWidthDiff += parseFloat(el.style[a]) || 0;
      });
      v.forEach(a => {
        this.cellHeightDiff += parseFloat(el.style[a]) || 0;
      });
    }

    el.remove();
    r.remove();

    this.absoluteColumnMinWidth = Math.max(this.headerColumnWidthDiff, this.cellWidthDiff);
  }

  updateColumnCaches() {
    // Pre-calculate cell boundaries.
    this.columnPosLeft = [];
    this.columnPosRight = [];
    let x = 0;
    for (let i = 0, ii = this.columns.length; i < ii; i++) {
      this.columnPosLeft[i] = x;
      this.columnPosRight[i] = x + this.columns[i].width;
      x += this.columns[i].width;
    }
  }

  createColumnHeaders() {
    clearNode(this.$headers);
    this.$headers.style.width = this.getHeadersWidth() + 'px';

    clearNode(this.$headerRow);

    for (let i = 0; i < this.columns.length; i++) {
      let m = this.columns[i];

      let header = document.createElement('div');
      addClass(header, 'slick-header-column');

      let span = document.createElement('span');
      addClasses(span, 'slick-column-name', m.name, m.headerCssClass);
      header.appendChild(span);

      header.style.width = m.width - this.headerColumnWidthDiff + 'px';
      header.id = this.uid + m.id;
      header.title = m.toolTip || '';

      this.$headers.appendChild(header);

      if (this.options.showHeaderRow) {
        let headerRowCell = document.createElement('div');
        addClasses(headerRowCell, 'slick-headerrow-column', `l${i}`, `r${i}`);
        this.$headerRow.appendChild(headerRowCell);
      }
    }
  }

  createCssRules() {
    this.$style = document.createElement('style');
    this.$style.type = 'text/css';
    this.$style.media = 'screen';

    let rowHeight = (this.options.rowHeight - this.cellHeightDiff);
    let rules = [
      '.' + this.uid + ' .slick-header-column { left: 1000px; }',
      '.' + this.uid + ' .slick-top-panel { height:' + this.options.topPanelHeight + 'px; }',
      '.' + this.uid + ' .slick-preheader-panel { height:' + this.options.preHeaderPanelHeight + 'px; }',
      '.' + this.uid + ' .slick-headerrow-columns { height:' + this.options.headerRowHeight + 'px; }',
      '.' + this.uid + ' .slick-footerrow-columns { height:' + this.options.footerRowHeight + 'px; }',
      '.' + this.uid + ' .slick-cell { height:' + rowHeight + 'px; }',
      '.' + this.uid + ' .slick-row { height:' + this.options.rowHeight + 'px; }'
    ];

    for (let i = 0; i < this.columns.length; i++) {
      rules.push('.' + this.uid + ' .l' + i + ' { }');
      rules.push('.' + this.uid + ' .r' + i + ' { }');
    }

    this.$style.appendChild(document.createTextNode(rules.join(' ')));

    document.head.appendChild(this.$style);
  }

  resizeCanvas() {
    if (!this.initialized) { return; }
    if (this.options.autoHeight) {
      this.viewportH = this.options.rowHeight * this.getDataLengthIncludingAddNew();
    } else {
      this.viewportH = this.getViewportHeight();
    }

    this.numVisibleRows = Math.ceil(this.viewportH / this.options.rowHeight);
    this.viewportW = this.$container.clientWidth;
    if (!this.options.autoHeight) {
      this.$viewport.style.height = this.viewportH + 'px';
    }

    if (this.options.forceFitColumns) {
      this.autosizeColumns();
    }

    this.updateRowCount();
    this.handleScroll();
    // Since the width has changed, force the render() to reevaluate virtually rendered cells.
    this.lastRenderedScrollLeft = -1;
    this.render();
  }

  handleScroll() {
    let { scrollTop, scrollLeft } = this.$viewport;
    let vScrollDist = Math.abs(scrollTop - this.prevScrollTop);
    let hScrollDist = Math.abs(scrollLeft - this.prevScrollLeft);

    if (hScrollDist) {
      this.prevScrollLeft = scrollLeft;
      this.$headerScroller.scrollLeft = scrollLeft;
      this.$topPanelScroller.scrollLeft = scrollLeft;
      this.$headerRowScroller.scrollLeft = scrollLeft;
    }

    if (vScrollDist) {
      this.vScrollDir = this.prevScrollTop < scrollTop ? 1 : -1;
      this.prevScrollTop = scrollTop;

      // switch virtual pages if needed
      if (vScrollDist < this.viewportH) {
        this.scrollTo(scrollTop + this.offset);
      } else {
        let oldOffset = this.offset;
        if (this.h == this.viewportH) {
          this.page = 0;
        } else {
          this.page = Math.min(this.n - 1, Math.floor(scrollTop * ((this.th - this.viewportH) / (this.h - this.viewportH)) * (1 / this.ph)));
        }
        this.offset = Math.round(this.page * this.cj);
        if (oldOffset != this.offset) {
          this.invalidateAllRows();
        }
      }
    }

    if (hScrollDist || vScrollDist) {
      if (this.h_render) {
        clearTimeout(this.h_render);
      }

      if (Math.abs(this.lastRenderedScrollTop - scrollTop) > 20 ||
        Math.abs(this.lastRenderedScrollLeft - scrollLeft) > 20) {
        if (this.options.forceSyncScrolling || (
          Math.abs(this.lastRenderedScrollTop - scrollTop) < this.viewportH &&
          Math.abs(this.lastRenderedScrollLeft - scrollLeft) < this.viewportW)) {
          this.render();
        } else {
          this.h_render = setTimeout(this.render.bind(this), 50);
        }

        this.trigger(this.onViewportChanged, { grid: self });
      }
    }

    this.trigger(this.onScroll, { scrollLeft: scrollLeft, scrollTop: scrollTop, grid: self });
  }

  scrollTo(y) {
    y = Math.max(y, 0);
    y = Math.min(y, this.th - this.viewportH + (this.viewportHasHScroll ? this.scrollbarDimensions.height : 0));

    let oldOffset = this.offset;

    this.page = Math.min(this.n - 1, Math.floor(y / this.ph));
    this.offset = Math.round(this.page * this.cj);
    let newScrollTop = y - this.offset;

    if (this.offset != oldOffset) {
      let range = this.getVisibleRange(newScrollTop);
      this.cleanupRows(range);
      this.updateRowPositions();
    }

    if (this.prevScrollTop != newScrollTop) {
      this.vScrollDir = (this.prevScrollTop + oldOffset < newScrollTop + this.offset) ? 1 : -1;
      this.$viewport.scrollTop = (this.lastRenderedScrollTop = this.scrollTop = this.prevScrollTop = newScrollTop);

      this.trigger(this.onViewportChanged, { grid: this });
    }
  }

  public invalidateAllRows() {
    for (let row in this.rowsCache) {
      this.removeRowFromCache(row);
    }
    if (this.options.enableAsyncPostRenderCleanup) {
      this.startPostProcessingCleanup();
    }
  }

  private getDataLengthIncludingAddNew() {
    return this.getDataLength() + (!this.options.enableAddRow ? 0 : (!this.pagingActive || this.pagingIsLastPage ? 1 : 0));
  }

  getViewportHeight() {
    return parseFloat(this.$container.style.height) -
      parseFloat(this.$container.style.paddingTop) -
      parseFloat(this.$container.style.paddingBottom) -
      parseFloat(this.$headerScroller.style.height) -
      this.getVBoxDelta(this.$headerScroller) -
      (this.options.showTopPanel ? this.options.topPanelHeight + this.getVBoxDelta(this.$topPanelScroller) : 0) -
      (this.options.showHeaderRow ? this.options.headerRowHeight + this.getVBoxDelta(this.$headerRowScroller) : 0) -
      (this.options.createFooterRow && this.options.showFooterRow ? this.options.footerRowHeight + this.getVBoxDelta(this.$footerRowScroller) : 0) -
      (this.options.createPreHeaderPanel && this.options.showPreHeaderPanel ? this.options.preHeaderPanelHeight + this.getVBoxDelta(this.$preHeaderPanelScroller) : 0);
  }

  autosizeColumns() {
    let i, c,
      widths = [],
      shrinkLeeway = 0,
      total = 0,
      prevTotal,
      availWidth = this.viewportHasVScroll ? this.viewportW - this.scrollbarDimensions.width : this.viewportW;

    for (i = 0; i < this.columns.length; i++) {
      c = this.columns[i];
      widths.push(c.width);
      total += c.width;
      if (c.resizable) {
        shrinkLeeway += c.width - Math.max(c.minWidth, this.absoluteColumnMinWidth);
      }
    }

    // shrink
    prevTotal = total;
    while (total > availWidth && shrinkLeeway) {
      let shrinkProportion = (total - availWidth) / shrinkLeeway;
      for (i = 0; i < this.columns.length && total > availWidth; i++) {
        c = this.columns[i];
        let width = widths[i];
        if (!c.resizable || width <= c.minWidth || width <= this.absoluteColumnMinWidth) {
          continue;
        }
        let absMinWidth = Math.max(c.minWidth, this.absoluteColumnMinWidth);
        let shrinkSize = Math.floor(shrinkProportion * (width - absMinWidth)) || 1;
        shrinkSize = Math.min(shrinkSize, width - absMinWidth);
        total -= shrinkSize;
        shrinkLeeway -= shrinkSize;
        widths[i] -= shrinkSize;
      }
      if (prevTotal <= total) {  // avoid infinite loop
        break;
      }
      prevTotal = total;
    }

    // grow
    prevTotal = total;
    while (total < availWidth) {
      let growProportion = availWidth / total;
      for (i = 0; i < this.columns.length && total < availWidth; i++) {
        c = this.columns[i];
        let currentWidth = widths[i];
        let growSize;

        if (!c.resizable || c.maxWidth <= currentWidth) {
          growSize = 0;
        } else {
          growSize = Math.min(Math.floor(growProportion * currentWidth) - currentWidth, (c.maxWidth - currentWidth) || 1000000) || 1;
        }
        total += growSize;
        widths[i] += (total <= availWidth ? growSize : 0);
      }
      if (prevTotal >= total) {  // avoid infinite loop
        break;
      }
      prevTotal = total;
    }

    let reRender = false;
    for (i = 0; i < this.columns.length; i++) {
      if (this.columns[i].rerenderOnResize && this.columns[i].width != widths[i]) {
        reRender = true;
      }
      this.columns[i].width = widths[i];
    }

    this.applyColumnHeaderWidths();
    this.updateCanvasWidth(true);
    if (reRender) {
      this.invalidateAllRows();
      this.render();
    }
  }

  render() {
    if (!this.initialized) {
      return;
    }
    let visible = this.getVisibleRange();
    let rendered = this.getRenderedRange();

    // remove rows no longer in the viewport
    this.cleanupRows(rendered);

    // add new rows & missing cells in existing rows
    if (this.lastRenderedScrollLeft != this.scrollLeft) {
      this.cleanUpAndRenderCells(rendered);
    }

    // render missing rows
    this.renderRows(rendered);

    this.postProcessFromRow = visible.top;
    this.postProcessToRow = Math.min(this.getDataLengthIncludingAddNew() - 1, visible.bottom);
    this.startPostProcessing();

    this.lastRenderedScrollTop = this.scrollTop;
    this.lastRenderedScrollLeft = this.scrollLeft;
    this.h_render = null;
  }

  trigger(evt, args, e?) {
    e = e || new EventData();
    args = args || {};
    args.grid = self;
    return evt.notify(args, e, self);
  }

  private getVisibleRange(viewportTop?, viewportLeft?) {
    if (viewportTop == null) {
      viewportTop = this.scrollTop;
    }
    if (viewportLeft == null) {
      viewportLeft = this.scrollLeft;
    }

    return {
      top: this.getRowFromPosition(viewportTop),
      bottom: this.getRowFromPosition(viewportTop + this.viewportH) + 1,
      leftPx: viewportLeft,
      rightPx: viewportLeft + this.viewportW
    };
  }

  updateRowCount() {
    if (!this.initialized) { return; }

    let dataLength = this.getDataLength();
    let dataLengthIncludingAddNew = this.getDataLengthIncludingAddNew();
    let numberOfRows = dataLengthIncludingAddNew +
      (this.options.leaveSpaceForNewRows ? this.numVisibleRows - 1 : 0);

    let oldViewportHasVScroll = this.viewportHasVScroll;
    // with autoHeight, we do not need to accommodate the vertical scroll bar
    this.viewportHasVScroll = this.options.alwaysShowVerticalScroll || !this.options.autoHeight && (numberOfRows * this.options.rowHeight > this.viewportH);
    this.viewportHasHScroll = (this.canvasWidth > this.viewportW - this.scrollbarDimensions.width);

    // remove the rows that are now outside of the data range
    // this helps avoid redundant calls to .removeRow() when the size of the data decreased by thousands of rows
    let r1 = dataLength - 1;
    for (let i in this.rowsCache) {
      if (+i > r1) {
        this.removeRowFromCache(i);
      }
    }
    if (this.options.enableAsyncPostRenderCleanup) { this.startPostProcessingCleanup(); }

    if (this.activeCellNode && this.activeRow > r1) {
      this.resetActiveCell();
    }

    let oldH = this.h;
    this.th = Math.max(this.options.rowHeight * numberOfRows, this.viewportH - this.scrollbarDimensions.height);
    if (this.th < maxSupportedCssHeight) {
      // just one page
      this.h = this.ph = this.th;
      this.n = 1;
      this.cj = 0;
    } else {
      // break into pages
      this.h = maxSupportedCssHeight;
      this.ph = this.h / 100;
      this.n = Math.floor(this.th / this.ph);
      this.cj = (this.th - this.h) / (this.n - 1);
    }

    if (this.h !== oldH) {
      this.$canvas.style.height = this.h + 'px';
      this.scrollTop = this.$viewport.scrollTop;
    }

    let oldScrollTopInRange = (this.scrollTop + this.offset <= this.th - this.viewportH);

    if (this.th == 0 || this.scrollTop == 0) {
      this.page = this.offset = 0;
    } else if (oldScrollTopInRange) {
      // maintain virtual position
      this.scrollTo(this.scrollTop + this.offset);
    } else {
      // scroll to bottom
      this.scrollTo(this.th - this.viewportH);
    }

    if (this.h != oldH && this.options.autoHeight) {
      this.resizeCanvas();
    }

    if (this.options.forceFitColumns && oldViewportHasVScroll != this.viewportHasVScroll) {
      this.autosizeColumns();
    }
    this.updateCanvasWidth(false);
  }

  cleanupRows(rangeToKeep) {
    for (let i in this.rowsCache) {
      if ((+i && (+i < rangeToKeep.top || +i > rangeToKeep.bottom))) {
        this.removeRowFromCache(i);
      }
    }
    if (this.options.enableAsyncPostRenderCleanup) { this.startPostProcessingCleanup(); }
  }

  updateRowPositions() {
    for (let row in this.rowsCache) {
      this.rowsCache[row].rowNode.style.top = this.getRowTop(row) + 'px';
    }
  }

  removeRowFromCache(row) {
    let cacheEntry = this.rowsCache[row];
    if (!cacheEntry) {
      return;
    }

    if (cacheEntry.rowNode) {
      if (this.rowNodeFromLastMouseWheelEvent === cacheEntry.rowNode) {
        cacheEntry.rowNode.style.display = 'none';
        this.zombieRowNodeFromLastMouseWheelEvent = this.rowNodeFromLastMouseWheelEvent;
        this.zombieRowCacheFromLastMouseWheelEvent = cacheEntry;
        this.zombieRowPostProcessedFromLastMouseWheelEvent = this.postProcessedRows[row];
        // ignore post processing cleanup in this case - it will be dealt with later
      } else {
        if (this.options.enableAsyncPostRenderCleanup && this.postProcessedRows[row]) {
          this.queuePostProcessedRowForCleanup(cacheEntry, this.postProcessedRows[row], row);
        } else {
          this.$canvas.removeChild(cacheEntry.rowNode);
        }
      }
    }

    delete this.rowsCache[row];
    delete this.postProcessedRows[row];
    this.renderedRows--;
    this.counter_rows_removed++;
  }

  startPostProcessingCleanup() {
    if (!this.options.enableAsyncPostRenderCleanup) {
      return;
    }
    clearTimeout(this.h_postrenderCleanup);
    this.h_postrenderCleanup = setTimeout(() => this.asyncPostProcessCleanupRows(), this.options.asyncPostRenderCleanupDelay);
  }

  getDataLength() {
    if (this.data.getLength) {
      return this.data.getLength();
    } else {
      return this.data.length;
    }
  }

  getVBoxDelta($el) {
    let p = ['borderTopWidth', 'borderBottomWidth', 'paddingTop', 'paddingBottom'];
    let delta = 0;
    p.forEach(a => {
      delta += parseFloat($el.style[a]) || 0;
    });
    return delta;
  }

  applyColumnHeaderWidths() {
    if (!this.initialized) { return; }

    for (let i = 0, headers = this.$headers.children, ii = this.columns.length; i < ii; i++) {
      let h = headers[i] as HTMLElement;

      if (h.clientWidth !== this.columns[i].width - this.headerColumnWidthDiff) {
        h.style.width = this.columns[i].width - this.headerColumnWidthDiff + 'px';
      }

    }

    this.updateColumnCaches();
  }

  updateCanvasWidth(forceColumnWidthsUpdate) {
    let oldCanvasWidth = this.canvasWidth;
    this.canvasWidth = this.getCanvasWidth();

    if (this.canvasWidth != oldCanvasWidth) {
      this.$canvas.style.width = this.canvasWidth + 'px';
      this.$headerRow.style.width = this.canvasWidth + 'px';
      this.$headers.style.width = this.getHeadersWidth() + 'px';
      this.viewportHasHScroll = (this.canvasWidth > this.viewportW - this.scrollbarDimensions.width);
    }

    let w = this.canvasWidth + (this.viewportHasVScroll ? this.scrollbarDimensions.width : 0);
    this.$headerRowSpacer.style.width = w + 'px';

    if (this.canvasWidth != oldCanvasWidth || forceColumnWidthsUpdate) {
      this.applyColumnWidths();
    }
  }

  getRenderedRange(viewportTop?, viewportLeft?) {
    let range = this.getVisibleRange(viewportTop, viewportLeft);
    let buffer = Math.round(this.viewportH / this.options.rowHeight);
    let minBuffer = this.options.minRowBuffer;

    if (this.vScrollDir == -1) {
      range.top -= buffer;
      range.bottom += minBuffer;
    } else if (this.vScrollDir == 1) {
      range.top -= minBuffer;
      range.bottom += buffer;
    } else {
      range.top -= minBuffer;
      range.bottom += minBuffer;
    }

    range.top = Math.max(0, range.top);
    range.bottom = Math.min(this.getDataLengthIncludingAddNew() - 1, range.bottom);

    range.leftPx -= this.viewportW;
    range.rightPx += this.viewportW;

    range.leftPx = Math.max(0, range.leftPx);
    range.rightPx = Math.min(this.canvasWidth, range.rightPx);

    return range;
  }

  cleanUpAndRenderCells(range) {
    let cacheEntry;
    let stringArray = [];
    let processedRows = [];
    let cellsAdded;
    let totalCellsAdded = 0;
    let colspan;

    for (let row = range.top, btm = range.bottom; row <= btm; row++) {
      cacheEntry = this.rowsCache[row];
      if (!cacheEntry) {
        continue;
      }

      // cellRenderQueue populated in renderRows() needs to be cleared first
      this.ensureCellNodesInRowsCache(row);

      this.cleanUpCells(range, row);

      // Render missing cells.
      cellsAdded = 0;

      let metadata = this.data.getItemMetadata && this.data.getItemMetadata(row);
      metadata = metadata && metadata.columns;

      let d = this.getDataItem(row);

      // TODO:  shorten this loop (index? heuristics? binary search?)
      for (let i = 0, ii = this.columns.length; i < ii; i++) {
        // Cells to the right are outside the range.
        if (this.columnPosLeft[i] > range.rightPx) {
          break;
        }

        // Already rendered.
        if ((colspan = cacheEntry.cellColSpans[i]) != null) {
          i += (colspan > 1 ? colspan - 1 : 0);
          continue;
        }

        colspan = 1;
        if (metadata) {
          let columnData = metadata[this.columns[i].id] || metadata[i];
          colspan = (columnData && columnData.colspan) || 1;
          if (colspan === '*') {
            colspan = ii - i;
          }
        }

        if (this.columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
          this.appendCellHtml(stringArray, row, i, colspan, d);
          cellsAdded++;
        }

        i += (colspan > 1 ? colspan - 1 : 0);
      }

      if (cellsAdded) {
        totalCellsAdded += cellsAdded;
        processedRows.push(row);
      }
    }

    if (!stringArray.length) {
      return;
    }

    let x = document.createElement('div');
    x.innerHTML = stringArray.join('');

    let processedRow;
    let node;
    while ((processedRow = processedRows.pop()) != null) {
      cacheEntry = this.rowsCache[processedRow];
      let columnIdx;
      while ((columnIdx = cacheEntry.cellRenderQueue.pop()) != null) {
        node = x.lastChild;
        cacheEntry.rowNode.appendChild(node);
        cacheEntry.cellNodesByColumnIdx[columnIdx] = node;
      }
    }
  }

  renderRows(range) {
    let parentNode = this.$canvas,
      stringArray = [],
      rows = [],
      needToReselectCell = false,
      dataLength = this.getDataLength();

    for (let i = range.top, ii = range.bottom; i <= ii; i++) {
      if (this.rowsCache[i]) {
        continue;
      }
      this.renderedRows++;
      rows.push(i);

      // Create an entry right away so that appendRowHtml() can
      // start populatating it.
      this.rowsCache[i] = {
        'rowNode': null,

        // ColSpans of rendered cells (by column idx).
        // Can also be used for checking whether a cell has been rendered.
        'cellColSpans': [],

        // Cell nodes (by column idx).  Lazy-populated by ensureCellNodesInRowsCache().
        'cellNodesByColumnIdx': [],

        // Column indices of cell nodes that have been rendered, but not yet indexed in
        // cellNodesByColumnIdx.  These are in the same order as cell nodes added at the
        // end of the row.
        'cellRenderQueue': []
      };

      this.appendRowHtml(stringArray, i, range, dataLength);
      if (this.activeCellNode && this.activeRow === i) {
        needToReselectCell = true;
      }
      this.counter_rows_rendered++;
    }

    if (!rows.length) { return; }

    let x = document.createElement('div');
    x.innerHTML = stringArray.join('');

    for (let i = 0, ii = rows.length; i < ii; i++) {
      this.rowsCache[rows[i]].rowNode = parentNode.appendChild(x.firstChild);
    }

    if (needToReselectCell) {
      this.activeCellNode = this.getCellNode(this.activeRow, this.activeCell);
    }
  }

  startPostProcessing() {
    if (!this.options.enableAsyncPostRender) {
      return;
    }
    clearTimeout(this.h_postrender);
    this.h_postrender = setTimeout(() => this.asyncPostProcessRows(), this.options.asyncPostRenderDelay);
  }

  getRowFromPosition(y) {
    return Math.floor((y + this.offset) / this.options.rowHeight);
  }

  setActiveCellInternal(newCell, opt_editMode, preClickModeOn = false) {
    if (this.activeCellNode !== null) {
      removeClass(this.activeCellNode, 'active');
      if (this.rowsCache[this.activeRow]) {
        removeClass(this.rowsCache[this.activeRow].rowNode, 'active');
      }
    }

    let activeCellChanged = (this.activeCellNode !== newCell);
    this.activeCellNode = newCell;

    if (this.activeCellNode != null) {
      this.activeRow = this.getRowFromNode(this.activeCellNode.parentNode);
      this.activeCell = this.activePosX = this.getCellFromNode(this.activeCellNode);

      if (opt_editMode == null) {
        opt_editMode = (this.activeRow == this.getDataLength()) || this.options.autoEdit;
      }

      if (this.options.showCellSelection) {
        addClass(this.activeCellNode, 'active');
        addClass(this.rowsCache[this.activeRow].rowNode, 'active');
      }
    } else {
      this.activeRow = this.activeCell = null;
    }
  }

  resetActiveCell() {
    this.setActiveCellInternal(null, false);
  }

  getRowTop(row) {
    return this.options.rowHeight * row - this.offset;
  }

  queuePostProcessedRowForCleanup(cacheEntry, postProcessedRow, rowIdx) {
    this.postProcessgroupId++;

    // store and detach node for later async cleanup
    for (let columnIdx in postProcessedRow) {
      if (postProcessedRow.hasOwnProperty(columnIdx)) {
        this.postProcessedCleanupQueue.push({
          actionType: 'C',
          groupId: this.postProcessgroupId,
          node: cacheEntry.cellNodesByColumnIdx[+columnIdx | 0],
          columnIdx: +columnIdx | 0,
          rowIdx: rowIdx
        });
      }
    }
    this.postProcessedCleanupQueue.push({
      actionType: 'R',
      groupId: this.postProcessgroupId,
      node: cacheEntry.rowNode
    });
    cacheEntry.rowNode.remove();
  }

  asyncPostProcessCleanupRows() {
    if (this.postProcessedCleanupQueue.length > 0) {
      let groupId = this.postProcessedCleanupQueue[0].groupId;

      // loop through all queue members with this groupID
      while (this.postProcessedCleanupQueue.length > 0 && this.postProcessedCleanupQueue[0].groupId == groupId) {
        let entry = this.postProcessedCleanupQueue.shift();
        if (entry.actionType == 'R') {
          entry.node.remove();
        }
        if (entry.actionType == 'C') {
          let column = this.columns[entry.columnIdx];
          if (column.asyncPostRenderCleanup && entry.node) {
            // cleanup must also remove element
            column.asyncPostRenderCleanup(entry.node, entry.rowIdx, column);
          }
        }
      }

      // call this function again after the specified delay
      this.h_postrenderCleanup = setTimeout(() => this.asyncPostProcessCleanupRows(), this.options.asyncPostRenderCleanupDelay);
    }
  }

  applyColumnWidths() {
    let x = 0, w, rule;
    for (let i = 0; i < this.columns.length; i++) {
      w = this.columns[i].width;

      rule = this.getColumnCssRules(i);
      rule.left.style.left = x + 'px';
      rule.right.style.right = (this.canvasWidth - x - w) + 'px';

      x += this.columns[i].width;
    }
  }

  ensureCellNodesInRowsCache(row) {
    let cacheEntry = this.rowsCache[row];
    if (cacheEntry) {
      if (cacheEntry.cellRenderQueue.length) {
        let lastChild = cacheEntry.rowNode.lastChild;
        while (cacheEntry.cellRenderQueue.length) {
          let columnIdx = cacheEntry.cellRenderQueue.pop();
          cacheEntry.cellNodesByColumnIdx[columnIdx] = lastChild;
          lastChild = lastChild.previousSibling;
        }
      }
    }
  }

  cleanUpCells(range, row) {
    let totalCellsRemoved = 0;
    let cacheEntry = this.rowsCache[row];

    // Remove cells outside the range.
    let cellsToRemove = [];
    for (let i in cacheEntry.cellNodesByColumnIdx) {
      // I really hate it when people mess with Array.prototype.
      if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(i)) {
        continue;
      }

      // This is a string, so it needs to be cast back to a number.

      let colspan = cacheEntry.cellColSpans[i];
      if (this.columnPosLeft[i] > range.rightPx ||
        this.columnPosRight[Math.min(this.columns.length - 1, +i + colspan - 1)] < range.leftPx) {
        if (!(row == this.activeRow && i == this.activeCell)) {
          cellsToRemove.push(i);
        }
      }
    }

    let cellToRemove, node;
    this.postProcessgroupId++;
    while ((cellToRemove = cellsToRemove.pop()) != null) {
      node = cacheEntry.cellNodesByColumnIdx[cellToRemove];
      if (this.options.enableAsyncPostRenderCleanup && this.postProcessedRows[row] && this.postProcessedRows[row][cellToRemove]) {
        this.queuePostProcessedCellForCleanup(node, cellToRemove, row);
      } else {
        cacheEntry.rowNode.removeChild(node);
      }

      delete cacheEntry.cellColSpans[cellToRemove];
      delete cacheEntry.cellNodesByColumnIdx[cellToRemove];
      if (this.postProcessedRows[row]) {
        delete this.postProcessedRows[row][cellToRemove];
      }
      totalCellsRemoved++;
    }
  }

  appendRowHtml(stringArray, row, range, dataLength) {
    let d = this.getDataItem(row);
    let dataLoading = row < dataLength && !d;
    let rowCss = 'slick-row' +
      (dataLoading ? ' loading' : '') +
      (row === this.activeRow && this.options.showCellSelection ? ' active' : '') +
      (row % 2 == 1 ? ' odd' : ' even');

    if (!d) {
      rowCss += ' ' + this.options.addNewRowCssClass;
    }

    let metadata = this.data.getItemMetadata && this.data.getItemMetadata(row);

    if (metadata && metadata.cssClasses) {
      rowCss += ' ' + metadata.cssClasses;
    }

    stringArray.push('<div class=\'ui-widget-content ' + rowCss + '\' style=\'top:' + this.getRowTop(row) + 'px\'>');

    let colspan, m;
    for (let i = 0, ii = this.columns.length; i < ii; i++) {
      m = this.columns[i];
      colspan = 1;
      if (metadata && metadata.columns) {
        let columnData = metadata.columns[m.id] || metadata.columns[i];
        colspan = (columnData && columnData.colspan) || 1;
        if (colspan === '*') {
          colspan = ii - i;
        }
      }

      // Do not render cells outside of the viewport.
      if (this.columnPosRight[Math.min(ii - 1, i + colspan - 1)] > range.leftPx) {
        if (this.columnPosLeft[i] > range.rightPx) {
          // All columns to the right are outside the range.
          break;
        }

        this.appendCellHtml(stringArray, row, i, colspan, d);
      }

      if (colspan > 1) {
        i += (colspan - 1);
      }
    }

    stringArray.push('</div>');
  }

  getDataItem(i) {
    if (this.data.getItem) {
      return this.data.getItem(i);
    } else {
      return this.data[i];
    }
  }

  appendCellHtml(stringArray, row, cell, colspan, item) {
    // stringArray: stringBuilder containing the HTML parts
    // row, cell: row and column index
    // colspan: HTML colspan
    // item: grid data for row

    let m = this.columns[cell];
    let cellCss = 'slick-cell l' + cell + ' r' + Math.min(this.columns.length - 1, cell + colspan - 1) +
      (m.cssClass ? ' ' + m.cssClass : '');
    if (row === this.activeRow && cell === this.activeCell && this.options.showCellSelection) {
      cellCss += (' active');
    }

    // TODO:  merge them together in the setter
    for (let key in this.cellCssClasses) {
      if (this.cellCssClasses[key][row] && this.cellCssClasses[key][row][m.id]) {
        cellCss += (' ' + this.cellCssClasses[key][row][m.id]);
      }
    }

    let value = null;
    let formatterResult: any;
    if (item) {
      value = this.getDataItemValueForColumn(item, m);
      formatterResult = this.getFormatter(row, m)(row, cell, value, m, item, this);
      if (formatterResult === null || formatterResult === undefined) { formatterResult = ''; }
    }

    // get addl css class names from object type formatter return and from string type return of onBeforeAppendCell
    let addlCssClasses = this.trigger(this.onBeforeAppendCell, { row: row, cell: cell, grid: self, value: value, dataContext: item }) || '';
    addlCssClasses += (formatterResult && formatterResult.addClasses ? (addlCssClasses ? ' ' : '') + formatterResult.addClasses : '');

    stringArray.push('<div class=\'' + cellCss + (addlCssClasses ? ' ' + addlCssClasses : '') + '\'>');

    // if there is a corresponding row (if not, this is the Add New row or this data hasn't been loaded yet)
    if (item) {
      stringArray.push(Object.prototype.toString.call(formatterResult) !== '[object Object]' ? formatterResult : formatterResult.text);
    }

    stringArray.push('</div>');

    this.rowsCache[row].cellRenderQueue.push(cell);
    this.rowsCache[row].cellColSpans[cell] = colspan;
  }

  getCellNodeBox(row, cell) {
    if (!this.cellExists(row, cell)) {
      return null;
    }

    let y1 = this.getRowTop(row);
    let y2 = y1 + this.options.rowHeight - 1;
    let x1 = 0;
    for (let i = 0; i < cell; i++) {
      x1 += this.columns[i].width;
    }
    let x2 = x1 + this.columns[cell].width;

    return {
      top: y1,
      left: x1,
      bottom: y2,
      right: x2
    };
  }

  getCellNode(row, cell) {
    if (this.rowsCache[row]) {
      this.ensureCellNodesInRowsCache(row);
      return this.rowsCache[row].cellNodesByColumnIdx[cell];
    }
    return null;
  }

  asyncPostProcessRows() {
    let dataLength = this.getDataLength();
    while (this.postProcessFromRow <= this.postProcessToRow) {
      let row = (this.vScrollDir >= 0) ? this.postProcessFromRow++ : this.postProcessToRow--;
      let cacheEntry = this.rowsCache[row];
      if (!cacheEntry || row >= dataLength) {
        continue;
      }

      if (!this.postProcessedRows[row]) {
        this.postProcessedRows[row] = {};
      }

      this.ensureCellNodesInRowsCache(row);
      for (let columnIdx in cacheEntry.cellNodesByColumnIdx) {
        if (!cacheEntry.cellNodesByColumnIdx.hasOwnProperty(columnIdx)) {
          continue;
        }

        let m = this.columns[columnIdx];
        let processedStatus = this.postProcessedRows[row][columnIdx]; // C=cleanup and re-render, R=rendered
        if (m.asyncPostRender && processedStatus !== 'R') {
          let node = cacheEntry.cellNodesByColumnIdx[columnIdx];
          if (node) {
            m.asyncPostRender(node, row, this.getDataItem(row), m, (processedStatus === 'C'));
          }
          this.postProcessedRows[row][columnIdx] = 'R';
        }
      }

      this.h_postrender = setTimeout(() => this.asyncPostProcessRows(), this.options.asyncPostRenderDelay);
      return;
    }
  }

  getRowFromNode(rowNode) {
    for (let row in this.rowsCache) {
      if (this.rowsCache[row].rowNode === rowNode) {
        return +row | 0;
      }
    }

    return null;
  }

  getCellFromNode(cellNode) {
    // read column number from .l<columnNumber> CSS class
    let cls = /l\d+/.exec(cellNode.className);
    if (!cls) {
      throw new Error('getCellFromNode: cannot get cell - ' + cellNode.className);
    }
    return parseInt(cls[0].substr(1, cls[0].length - 1), 10);
  }

  getColumnCssRules(idx) {
    let i;
    if (!this.stylesheet) {
      let sheets = document.styleSheets;
      for (i = 0; i < sheets.length; i++) {
        if ((sheets[i].ownerNode) == this.$style) {
          this.stylesheet = sheets[i];
          break;
        }
      }

      if (!this.stylesheet) {
        throw new Error('Cannot find stylesheet.');
      }

      // find and cache column CSS rules
      this.columnCssRulesL = [];
      this.columnCssRulesR = [];
      let cssRules = (this.stylesheet.cssRules || this.stylesheet.rules);
      let matches, columnIdx;
      for (i = 0; i < cssRules.length; i++) {
        let selector = cssRules[i].selectorText;
        if (matches = /\.l\d+/.exec(selector)) {
          columnIdx = parseInt(matches[0].substr(2, matches[0].length - 2), 10);
          this.columnCssRulesL[columnIdx] = cssRules[i];
        } else if (matches = /\.r\d+/.exec(selector)) {
          columnIdx = parseInt(matches[0].substr(2, matches[0].length - 2), 10);
          this.columnCssRulesR[columnIdx] = cssRules[i];
        }
      }
    }

    return {
      'left': this.columnCssRulesL[idx],
      'right': this.columnCssRulesR[idx]
    };
  }

  queuePostProcessedCellForCleanup(cellnode, columnIdx, rowIdx) {
    this.postProcessedCleanupQueue.push({
      actionType: 'C',
      groupId: this.postProcessgroupId,
      node: cellnode,
      columnIdx: columnIdx,
      rowIdx: rowIdx
    });
    cellnode.remove();
  }

  getDataItemValueForColumn(item, columnDef) {
    if (this.options.dataItemColumnValueExtractor) {
      return this.options.dataItemColumnValueExtractor(item, columnDef);
    }
    return item[columnDef.field];
  }

  getFormatter(row, column) {
    let rowMetadata = this.data.getItemMetadata && this.data.getItemMetadata(row);

    // look up by id, then index
    let columnOverrides = rowMetadata &&
      rowMetadata.columns &&
      (rowMetadata.columns[column.id] || rowMetadata.columns[this.getColumnIndex(column.id)]);

    return (columnOverrides && columnOverrides.formatter) ||
      (rowMetadata && rowMetadata.formatter) ||
      column.formatter ||
      (this.options.formatterFactory && this.options.formatterFactory.getFormatter(column)) ||
      this.options.defaultFormatter;
  }

  cellExists(row, cell) {
    return !(row < 0 || row >= this.getDataLength() || cell < 0 || cell >= this.columns.length);
  }

  destroy() {
    this.trigger(this.onBeforeDestroy, { grid: this });

    let i = this.plugins.length;
    while (i--) {
      this.unregisterPlugin(this.plugins[i]);
    }

    this.unbindAncestorScrollEvents();
    this.removeCssRules();

    this.$container.innerHTML = '';
    removeClass(this.$container, this.uid);
  }

  removeCssRules() {
    this.$style.remove();
    this.stylesheet = null;
  }

  unbindAncestorScrollEvents() {
    if (!this.$boundAncestors) {
      return;
    }
    // $boundAncestors.off('scroll.' + uid);
    this.$boundAncestors = null;
  }

  getColumnIndex(id) {
    return this.columnsById[id];
  }

  registerPlugin(plugin) {
    this.plugins.unshift(plugin);
    plugin.init(this);
  }

  unregisterPlugin(plugin) {
    for (let i = this.plugins.length; i >= 0; i--) {
      if (this.plugins[i] === plugin) {
        if (this.plugins[i].destroy) {
          this.plugins[i].destroy();
        }
        this.plugins.splice(i, 1);
        break;
      }
    }
  }

  invalidate() {
    this.updateRowCount();
    this.invalidateAllRows();
    this.render();
  }

}
