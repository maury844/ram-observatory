import type { FeatureCollection, MultiPolygon, Polygon, Feature } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

export type Land = Feature<MultiPolygon | Polygon> | FeatureCollection;

/**
 * Natural Earth 1:110m land (public domain) via the world-atlas package, converted from
 * TopoJSON at runtime. Loaded lazily so the first paint (number + ocean) doesn't wait for it.
 */
export async function loadLand(): Promise<Land> {
  const [{ feature }, topoModule] = await Promise.all([
    import('topojson-client'),
    import('world-atlas/land-110m.json'),
  ]);
  const topo = (topoModule.default ?? topoModule) as unknown as Topology<{
    land: GeometryCollection;
  }>;
  return feature(topo, topo.objects.land) as Land;
}
