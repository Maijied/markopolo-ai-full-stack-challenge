import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectionsPanelComponent } from './connections-panel.component';

describe('ConnectionsPanelComponent', () => {
  let component: ConnectionsPanelComponent;
  let fixture: ComponentFixture<ConnectionsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectionsPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConnectionsPanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
