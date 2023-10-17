import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GeoJSON } from 'geojson';
import { MapService } from '@geonature_common/map/map.service';

import { SitesService, SitesGroupService } from './api-geom.service';
import { FormService } from './form.service';

// This service will be used for sites and sites groups

const siteGroupStyle = {
  fillColor: '#800080',
  fillOpacity: 0.5,
  color: '#800080',
  opacity: 0.8,
  weight: 2,
  fill: true,
};

@Injectable()
export class GeoJSONService {
  geojsonSitesGroups: GeoJSON.FeatureCollection;
  geojsonSites: GeoJSON.FeatureCollection;
  sitesGroupFeatureGroup: L.FeatureGroup;
  sitesFeatureGroup: L.FeatureGroup;
  currentLayer:any = null ;

  // private currentLayer = new ReplaySubject<any>(1);
  // currentLayerForm = this.currentLayer.asObservable();
  
  constructor(
    private _sites_group_service: SitesGroupService,
    private _sites_service: SitesService,
    private _mapService: MapService,
    private _formService: FormService
  ) {
    // this.setObservables()
  }

  getSitesGroupsGeometries(onEachFeature: Function, params = {}) {
    this._sites_group_service
      .get_geometries(params)
      .subscribe((data: GeoJSON.FeatureCollection) => {
        this.geojsonSitesGroups = data;
        this.sitesGroupFeatureGroup = this.setMapData(data, onEachFeature, siteGroupStyle);
      });
  }

  getSitesGroupsChildGeometries(onEachFeature: Function, params = {}) {
    this._sites_service.get_geometries(params).subscribe((data: GeoJSON.FeatureCollection) => {
      this.removeFeatureGroup(this.sitesFeatureGroup);
      this.sitesFeatureGroup = this.setMapData(data, onEachFeature);
    });
  }

  setGeomSiteGroupFromExistingObject(geom){
    this.sitesFeatureGroup = this.setMapData(geom, () => {});
  }

  setMapData(
    geojson: GeoJSON.Geometry | GeoJSON.FeatureCollection,
    onEachFeature: Function,
    style?
  ) {
    const map = this._mapService.getMap();
    const layer: L.Layer = this._mapService.createGeojson(geojson, false, onEachFeature, style);
    const featureGroup = new L.FeatureGroup();
    this._mapService.map.addLayer(featureGroup);
    featureGroup.addLayer(layer);
    map.fitBounds(featureGroup.getBounds());
    return featureGroup;
  }

  setMapDataWithFeatureGroup(
    featureGroup: L.FeatureGroup[],
  ) {
    for (const layer of featureGroup){
      this._mapService.map.addLayer(layer);
    }
  }

  setCurrentmapData(geom){
    this.currentLayer = geom
  }

  setMapBeforeEdit(geom){
    this.currentLayer = null;
    this.setMapData(geom, () => {});
  }

  removeFeatureGroup(feature: L.FeatureGroup) {
    if (feature) {
      this._mapService.map.removeLayer(feature);
    }
  }

  removeLayerFeatureGroups() {
    return this._mapService.removeLayerFeatureGroups
  }

  fileLayerFeatureGroup(){
    return   this._mapService.fileLayerFeatureGroup
  }


  onEachFeature() {}

  filterSitesGroups(siteGroupId: number) {
    if (this.geojsonSitesGroups !== undefined) {
      const features = this.geojsonSitesGroups.features.filter(
        (feature) => feature.properties.id_sites_group == siteGroupId
      );
      this.geojsonSitesGroups.features = features;
      this.removeFeatureGroup(this.sitesGroupFeatureGroup);
      this.setMapData(this.geojsonSitesGroups, this.onEachFeature, siteGroupStyle);
    }
  }

  selectSitesGroupLayer(id: number) {
    this.sitesGroupFeatureGroup.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        layer.eachLayer((sublayer: L.GeoJSON) => {
          const feature = sublayer.feature as GeoJSON.Feature;
          if (feature.properties['id_sites_group'] == id) {
            sublayer.openPopup();
            return;
          }
        });
      }
    });
  }

  removeLayerByIdSite(id: number) {
    const layers = this.selectSitesLayer(id);
    this.removeFeatureGroup(layers);
  }

  selectSitesLayer(id: number) {
    const layers = this.sitesFeatureGroup.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) {
        layer.eachLayer((sublayer: L.GeoJSON) => {
          const feature = sublayer.feature as GeoJSON.Feature;
          if (feature.properties['id_base_site'] == id) {
            sublayer.openPopup();
            return;
          }
        });
      }
    });
    return layers;
  }
  
  removeAllFeatureGroup(){
    // this._mapService.removeAllLayers(this._mapService.map,this._mapService.fileLayerFeatureGroup)
    let listFeatureGroup: L.FeatureGroup[] = []
    this._mapService.map.eachLayer( function(layer) {
    if (layer instanceof L.FeatureGroup){
      listFeatureGroup.push(layer)
    }
    } );
    // this.currentLayer = listFeatureGroup
    for (const featureGroup of listFeatureGroup){
      this.removeFeatureGroup(featureGroup)
    }
  }

}
