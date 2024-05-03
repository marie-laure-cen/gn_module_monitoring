import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';

import { merge } from 'rxjs';
import { filter } from 'rxjs/operators';

import { FormGroup } from '@angular/forms';
import { MonitoringObject } from '../../class/monitoring-object';
import { Layer, svg, Path } from 'leaflet';
import { ConfigService } from '../../services/config.service';
import { DataMonitoringObjectService } from '../../services/data-monitoring-object.service';
import { GeoJSONService } from '../../services/geojson.service';
import { Popup } from '../../utils/popup';

import { MapService } from '@geonature_common/map/map.service';
import { MapListService } from '@geonature_common/map-list/map-list.service';
import { Utils } from '../../utils/utils';
import * as L from 'leaflet';
import { ListService } from '../../services/list.service';

@Component({
  selector: 'pnx-monitoring-map',
  templateUrl: './monitoring-map.component.html',
  styleUrls: ['./monitoring-map.component.css'],
})
export class MonitoringMapComponent implements OnInit {
  @Input() bEdit: boolean;
  @Input() obj: MonitoringObject;

  @Input() selectedObject: Object;
  @Input() objForm: FormGroup;

  @Input() heightMap;

  bListen = true;
  panes = {};
  renderers = {};
  map;
  selectedSiteId: Number;
  currentSiteId: Number;
  publicDisplaySitesGroup: boolean = false;

  // todo mettre en config
  styles = {
    hidden: {
      opacity: 0,
      fillOpacity: 0,
      color: 'blue',
      zIndex: 0,
    },
    default: {
      opacity: 0.7,
      fillOpacity: 0.5,
      color: 'blue',
      zIndex: 600,
    },
    current: {
      opacity: 0.7,
      fillOpacity: 0.5,
      color: 'green',
      zIndex: 650,
    },
    selected: {
      opacity: 0.7,
      fillOpacity: 0.5,
      color: 'red',
      zIndex: 660,
    },
    edit: {
      opacity: 0.2,
      fillOpacity: 0.1,
      color: 'blue',
      zIndex: 600,
    },
  };

  constructor(
    protected _mapService: MapService,
    private _configService: ConfigService,
    private _data: DataMonitoringObjectService,
    private _mapListService: MapListService,
    private _geojsonService: GeoJSONService,
    private _popup: Popup,
    public listService: ListService
  ) {}

  ngOnInit() {
    // gestion des interractions carte list
    const tableType = ['sites_group', 'site'];

    merge(
      this.listService.listType$,
      this.listService.preFilters$,
      this.listService.tableFilters$.pipe(
        filter(
          () =>
            // Les filtres des tableaux ne sont pris en compte que pour les sites ou les groupes de site
            tableType.indexOf(this.listService.listType$.getValue()) >= 0
        )
      )
    ).subscribe((val) => {
      if (
        this.listService.listType$.getValue() !== null &&
        this.listService.preFilters$.getValue() !== null
      ) {
        if (
          (this.listService.tableFilters$.getValue() === null &&
            tableType.indexOf(this.listService.listType$.getValue()) < 0) ||
          this.listService.tableFilters$.getValue() !== null
        ) {
          this.refresh_geom_data();
        }
      }
    });
  }

  refresh_geom_data() {
    const params = {
      ...this.listService.preFilters$.getValue(),
      ...this.listService.tableFilters$.getValue(),
    };
    this._geojsonService.removeAllLayers();
    let displayObject;
    // Choix des objets a afficher
    if (this.bEdit && !this.obj.id) {
      // Si création d'un nouvel objet on n'affiche rien
      displayObject = undefined;
    } else if (this.bEdit && this.obj.id) {
      // Si modification affichage de l'objet en cours
      displayObject = this.obj.objectType;
    } else if (this.obj.objectType == 'module') {
      // Si module affichage du type d'objet courant
      displayObject = this.listService.listType;
    } else if (this.obj.objectType == 'sites_group') {
      // Si page détail d'un groupe de site affichage du groupe de site et de ces enfants
      displayObject = 'sites_group_with_child';
    } else {
      // Sinon affichage des sites
      displayObject = 'site';
    }

    this._geojsonService.removeAllFeatureGroup();
    if (displayObject == 'site') {
      this._geojsonService.getSitesGroupsChildGeometries(this.onEachFeatureSite(), params);
    } else if (displayObject == 'sites_group') {
      this._geojsonService.getSitesGroupsGeometries(this.onEachFeatureGroupSite(), params);
    } else if (displayObject == 'sites_group_with_child') {
      this._geojsonService.getSitesGroupsGeometriesWithSites(
        this.onEachFeatureGroupSite(),
        this.onEachFeatureSite(),
        params
      );
    }
  }

  onEachFeatureSite() {
    return (feature, layer) => {
      const url = [
        'object',
        this.obj.moduleCode,
        'site',
        layer['feature'].properties.id_base_site,
      ].join('/');
      const popup = this._popup.setPopup(url, feature, 'base_site_name');
      layer.bindPopup(popup);
    };
  }

  onEachFeatureGroupSite() {
    return (feature, layer) => {
      const url = [
        'object',
        this.obj.moduleCode,
        'sites_group',
        layer['feature'].properties.id_sites_group,
      ].join('/');
      const popup = this._popup.setPopup(url, feature, 'sites_group_name');
      layer.bindPopup(popup);
    };
  }

  initPanes() {
    const map = this._mapService.map;
    for (const paneKey of Object.keys(this.styles)) {
      const style = this.styles[paneKey];
      map.createPane(paneKey);
      const pane = map.getPane(paneKey);
      pane.style.zIndex = style.zIndex;
      const renderer = svg({ pane: paneKey });
      this.panes[paneKey] = pane;
      this.renderers[paneKey] = renderer;
    }
  }

  setSitesStyle(objectType = 'site') {
    if (this._configService.config()[this.obj.moduleCode]['module']['b_draw_sites_group']) {
      this.publicDisplaySitesGroup = true;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this._mapService.map) {
      return;
    }

    if (Object.keys(changes).includes('selectedObject')) {
      if (!this.selectedObject) {
        return;
      }
      if (this.obj.objectType == 'module' && Object.keys(this.selectedObject).length > 0) {
        if (this.listService.listType == 'sites_group') {
          this._geojsonService.selectSitesGroupLayer(this.selectedObject['id'], true);
        } else if (this.listService.listType == 'site') {
          this._geojsonService.selectSitesLayer(this.selectedObject['id'], true);
        }
      }
    }
    if (Object.keys(changes).includes('bEdit')) {
      this.setSitesStyle(this.obj.objectType);
    }
  }
}
