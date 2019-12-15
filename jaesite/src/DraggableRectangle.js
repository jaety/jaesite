import { Rectangle as LeafletRectangle } from 'leaflet'

import { Path, withLeaflet}  from 'react-leaflet'
import type { LatLngBounds, PathProps } from 'react-leaflet/types'

type LeafletElement = LeafletRectangle
type Props = { bounds: LatLngBounds } & PathProps

class Rectangle extends Path<LeafletElement, Props> {
  createLeafletElement(props: Props): LeafletElement {
    return new LeafletRectangle(props.bounds, this.getOptions(props))
  }

  componentDidMount() {
      super.componentDidMount();
      this.leafletElement.transform.enable();
      this.leafletElement.transform.setOptions({uniformScaling: false})
      //this.leafletElement.transform.setOptions({rotation: false, scaling: true, uniformScaling: false}); // {rotation: false});
      this.leafletElement.dragging.enable();
  }

  updateLeafletElement(fromProps: Props, toProps: Props) {
    if (toProps.bounds !== fromProps.bounds) {
      this.leafletElement.setBounds(toProps.bounds)
    }
    this.setStyleIfChanged(fromProps, toProps)
  }
}

export default withLeaflet(Rectangle)
