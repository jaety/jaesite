import { Rectangle as LeafletRectangle } from 'leaflet'

import { Path, withLeaflet}  from 'react-leaflet'
import type { LatLngBounds, PathProps } from 'react-leaflet/types'
import { Rect } from './Geometry'

type LeafletElement = LeafletRectangle
type Props = { bounds: LatLngBounds } & PathProps

class Rectangle extends Path<LeafletElement, Props> {
  static defaultProps = {
      onBoundChange: (x) => x
  }

  createLeafletElement(props: Props): LeafletElement {
    const rect = new LeafletRectangle(props.bounds.asLeafletBounds(), this.getOptions(props));
    rect.on('scaleend', this.onMoveEnd.bind(this));
    rect.on('dragend', this.onMoveEnd.bind(this));
    return rect;
  }

  componentDidMount() {
      super.componentDidMount();
      this.leafletElement.transform.enable();
      this.leafletElement.transform.setOptions({uniformScaling: false})
      //this.leafletElement.transform.setOptions({rotation: false, scaling: true, uniformScaling: false}); // {rotation: false});
      this.leafletElement.dragging.enable();
  }

  onMoveEnd(e) {
    const bounds = this.leafletElement.getBounds();
    const boundRect = Rect.fromLeafletBounds(bounds);
    this.props.onBoundChange(boundRect);
  }

  updateLeafletElement(fromProps: Props, toProps: Props) {
    if (toProps.bounds !== fromProps.bounds) {
      this.leafletElement.setBounds(toProps.bounds.asLeafletBounds())
      //this.props.onBoundChange(toProps.bounds);
    }
    this.setStyleIfChanged(fromProps, toProps)
  }
}

export default withLeaflet(Rectangle)
