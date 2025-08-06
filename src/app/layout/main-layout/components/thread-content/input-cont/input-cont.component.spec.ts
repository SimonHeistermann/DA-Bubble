import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputContComponent } from './input-cont.component';

describe('InputContComponent', () => {
  let component: InputContComponent;
  let fixture: ComponentFixture<InputContComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputContComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputContComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
