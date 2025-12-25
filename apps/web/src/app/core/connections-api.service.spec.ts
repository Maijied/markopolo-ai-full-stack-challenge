import { TestBed } from '@angular/core/testing';

import { ConnectionsApiService } from './connections-api.service';

describe('ConnectionsApiService', () => {
  let service: ConnectionsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConnectionsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
