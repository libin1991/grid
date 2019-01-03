import { CellFormatter, Datum, IGridColumnDefinition } from 'src/grid/grid';
import { IDisposable } from 'src/base/common/lifecycle';
import { addClass } from 'src/base/browser/dom';
import { GridContext } from 'src/grid/girdContext';
import { React, ReactDOM } from '../react';

export class ViewCell implements IDisposable {
  public width: number;

  private value: any;
  private domNode: HTMLElement;
  private host: HTMLElement;
  private formatter: CellFormatter;

  mounted: boolean = false;

  constructor(container: HTMLElement, private row: number, private cell: number, private datum: Datum, private col: IGridColumnDefinition) {
    this.value = datum[col.field];
    this.formatter = col.formatter;

    this.host = container;

    let el = document.createElement('div');
    el.className = 'nila-grid-cell';

    this.width = col.width;
    el.style.width = `${this.width}px`;
    this.domNode = el;
  }

  mount(slibing?: ViewCell) {
    this.mounted = true;
    if (slibing && slibing.mounted) {
      this.host.insertBefore(this.domNode, slibing.domNode);
    } else {
      this.host.appendChild(this.domNode);
    }
    ReactDOM.render(React.createElement(this.formatter(this.row, this.cell, this.value, this.col, this.datum)), this.domNode);
  }

  unmount() {
    this.mounted = false;
    ReactDOM.unmountComponentAtNode(this.domNode);
    this.host.removeChild(this.domNode);
  }

  dispose() {
    this.mounted = false;
    ReactDOM.unmountComponentAtNode(this.domNode);
    this.domNode.remove();
  }
}

export class ViewRow implements IDisposable {
  domNode: HTMLElement;

  mounted: boolean = false;

  private cellCache: { [key: string]: ViewCell } = Object.create(null);

  host: HTMLElement;
  rowIndex: number;
  data: Datum;

  constructor(host: HTMLElement, rowIndex: number, data: Datum, private ctx: GridContext) {
    let container = document.createElement('div');
    addClass(container, 'nila-grid-row');
    this.domNode = container;
    this.host = host;
    this.rowIndex = rowIndex;
    this.data = data;
  }

  mount(slibing?: ViewRow) {
    this.mounted = true;
    if (slibing) {
      this.host.insertBefore(this.domNode, slibing.domNode);
    } else {
      this.host.appendChild(this.domNode);
    }
  }

  private mountCell(index: number): boolean {
    let cell: ViewCell = this.cellCache[index];
    if (!cell) {
      cell = new ViewCell(this.domNode, this.rowIndex, index, this.data, this.ctx.columns[index]);
      this.cellCache[index] = cell;
    }
    if (cell.mounted) return false;

    cell.mount(this.cellCache[index + 1]);
    return true;
  }

  private unmountCell(index: number): boolean {
    let cell = this.cellCache[index];
    if (cell) {
      cell.dispose();
      delete this.cellCache[index];
    }
    return true;
  }

  updateCell(headerMounted: string[], margin: number) {
    let thisMounted = Object.keys(this.cellCache);
    let h = {};
    for (let i = 0, len = headerMounted.length; i < len; i++) {
      h[headerMounted[i]] = true;
      this.mountCell(parseInt(headerMounted[i]));
    }
    for (let i = 0, len = thisMounted.length; i < len; i++) {
      if (!h[thisMounted[i]]) this.unmountCell(parseInt(thisMounted[i]));
    }

    this.domNode.style.left = margin + 'px';
  }

  dispose() {
    this.mounted = false;

    this.domNode.remove();

    Object.keys(this.cellCache).forEach(i => {
      this.cellCache[i].dispose();
      delete this.cellCache[i];
    });
  }
}
