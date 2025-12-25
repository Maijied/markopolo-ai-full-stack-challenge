import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SseDemoComponent } from './sse-demo.component';

describe('SseDemoComponent', () => {
  let component: SseDemoComponent;
  let fixture: ComponentFixture<SseDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SseDemoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SseDemoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
