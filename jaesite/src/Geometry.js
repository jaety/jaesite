
export class Rect {
  constructor(minx, miny, maxx, maxy) {
    [this.minx, this.miny, this.maxx, this.maxy] = [minx, miny, maxx, maxy];
  }

  static fromLeafletBounds(bounds) {
    new Rect(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth())
  }

  asLeafletBounds() {
    return [[this.miny, this.minx], [this.maxy, this.maxx]];
  }
  asQueryParams() {
    return `minx=${this.minx}&maxx=${this.maxx}&miny=${this.miny}&maxy=${this.maxy}`
  }
}
