import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileRefComponent } from './profile-ref.component';

describe('ProfileRefComponent', () => {
  let component: ProfileRefComponent;
  let fixture: ComponentFixture<ProfileRefComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileRefComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileRefComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
