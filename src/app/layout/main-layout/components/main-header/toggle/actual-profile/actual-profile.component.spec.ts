import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActualProfileComponent } from './actual-profile.component';

describe('ActualProfileComponent', () => {
  let component: ActualProfileComponent;
  let fixture: ComponentFixture<ActualProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActualProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActualProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
