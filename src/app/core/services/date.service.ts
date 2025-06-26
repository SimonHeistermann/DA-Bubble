import { Injectable } from '@angular/core';
import { Timestamp } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  constructor() {}

  isSameDay(currentDate: Date, previousDate: Date): Boolean {
    return  currentDate.getFullYear() === previousDate.getFullYear() &&
            currentDate.getMonth() === previousDate.getMonth() &&
            currentDate.getDate() === previousDate.getDate();
    
  }

  toDate(timestamp: Timestamp): Date {
    let timestampInSecond = timestamp.seconds;
    if (timestampInSecond.toString().length === 10) {
      timestampInSecond *= 1000; 
    }
    return new Date(timestampInSecond);
  }

  getHoursAndMinutes(timestamp: Timestamp): string {
    const date = this.toDate(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getGermanFullDate(timestamp: Timestamp): string {
    const date = this.toDate(timestamp);
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const givenDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffInTime = today.getTime() - givenDate.getTime();
    const diffInDays = diffInTime / (1000 * 60 * 60 * 24);

    if (diffInDays === 0) return 'Heute';
    if (diffInDays === 1) return 'Gestern';

    const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('de-DE', { month: 'long' });

    return `${weekday}, ${day} ${month}`;
  }



}