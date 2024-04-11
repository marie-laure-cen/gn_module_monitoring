import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class ListService {
  /**
   * Observable that stores the current tab selected (site / site_group).
   * Null if no tab is selected.
   */
  public listType$ = new BehaviorSubject<string | null>(null);

  public get listType() {
    return this.listType$.getValue();
  }

  public set listType(value: string | null) {
    this.listType$.next(value)
  }



  constructor() {

  }

}
