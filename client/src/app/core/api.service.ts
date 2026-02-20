import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ToyLine {
  id: number;
  name: string;
  slug: string;
  coverImage: string | null;
  _count?: { figures: number };
  series?: Series[];
  tags?: Tag[];
}

export interface Series {
  id: number;
  name: string;
  slug: string;
  toyLineId: number;
}

export interface Tag {
  id: number;
  name: string;
  toyLineId: number;
}

export interface Figure {
  id: number;
  name: string;
  year: number | null;
  notes: string | null;
  owned: boolean;
  toyLineId: number;
  seriesId: number;
  toyLine: ToyLine;
  series: Series;
  tags: Tag[];
  accessories: Accessory[];
  photos: Photo[];
  primaryPhoto?: Photo | null;
  accessoryCount?: number;
  ownedAccessoryCount?: number;
}

export interface Accessory {
  id: number;
  name: string;
  owned: boolean;
  figureId: number;
}

export interface Photo {
  id: number;
  filename: string;
  isPrimary: boolean;
  figureId: number;
}

export interface FigurePage {
  figures: Figure[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Stats {
  totalFigures: number;
  totalToylines: number;
  totalAccessories: number;
  ownedAccessories: number;
  completionPercent: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ToyLines
  getToylines(): Observable<ToyLine[]> {
    return this.http.get<ToyLine[]>('/api/toylines');
  }

  getToyline(slug: string): Observable<ToyLine> {
    return this.http.get<ToyLine>(`/api/toylines/${slug}`);
  }

  createToyline(name: string): Observable<ToyLine> {
    return this.http.post<ToyLine>('/api/toylines', { name });
  }

  updateToyline(id: number, data: Partial<ToyLine>): Observable<ToyLine> {
    return this.http.put<ToyLine>(`/api/toylines/${id}`, data);
  }

  deleteToyline(id: number): Observable<void> {
    return this.http.delete<void>(`/api/toylines/${id}`);
  }

  uploadToylineCover(id: number, file: File): Observable<ToyLine> {
    const formData = new FormData();
    formData.append('cover', file);
    return this.http.post<ToyLine>(`/api/toylines/${id}/cover`, formData);
  }

  // Series
  createSeries(name: string, toyLineId: number): Observable<Series> {
    return this.http.post<Series>('/api/series', { name, toyLineId });
  }

  updateSeries(id: number, name: string): Observable<Series> {
    return this.http.put<Series>(`/api/series/${id}`, { name });
  }

  deleteSeries(id: number): Observable<void> {
    return this.http.delete<void>(`/api/series/${id}`);
  }

  // Tags
  createTag(name: string, toyLineId: number): Observable<Tag> {
    return this.http.post<Tag>('/api/tags', { name, toyLineId });
  }

  updateTag(id: number, name: string): Observable<Tag> {
    return this.http.put<Tag>(`/api/tags/${id}`, { name });
  }

  deleteTag(id: number): Observable<void> {
    return this.http.delete<void>(`/api/tags/${id}`);
  }

  // Figures
  getFigures(params: {
    toylineId?: number;
    seriesId?: number;
    tagIds?: number[];
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<FigurePage> {
    let httpParams = new HttpParams();
    if (params.toylineId) httpParams = httpParams.set('toylineId', params.toylineId.toString());
    if (params.seriesId) httpParams = httpParams.set('seriesId', params.seriesId.toString());
    if (params.tagIds?.length) httpParams = httpParams.set('tagIds', params.tagIds.join(','));
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<FigurePage>('/api/figures', { params: httpParams });
  }

  getFigure(id: number): Observable<Figure> {
    return this.http.get<Figure>(`/api/figures/${id}`);
  }

  createFigure(data: {
    name: string;
    year?: number;
    notes?: string;
    owned?: boolean;
    toyLineId: number;
    seriesId: number;
    tagIds?: number[];
  }): Observable<Figure> {
    return this.http.post<Figure>('/api/figures', data);
  }

  updateFigure(id: number, data: {
    name?: string;
    year?: number | null;
    notes?: string | null;
    owned?: boolean;
    toyLineId?: number;
    seriesId?: number;
    tagIds?: number[];
  }): Observable<Figure> {
    return this.http.put<Figure>(`/api/figures/${id}`, data);
  }

  deleteFigure(id: number): Observable<void> {
    return this.http.delete<void>(`/api/figures/${id}`);
  }

  // Accessories
  addAccessory(figureId: number, name: string, owned = false): Observable<Accessory> {
    return this.http.post<Accessory>(`/api/figures/${figureId}/accessories`, { name, owned });
  }

  updateAccessory(id: number, data: { name?: string; owned?: boolean }): Observable<Accessory> {
    return this.http.put<Accessory>(`/api/figures/accessories/${id}`, data);
  }

  deleteAccessory(id: number): Observable<void> {
    return this.http.delete<void>(`/api/figures/accessories/${id}`);
  }

  // Photos
  uploadPhotos(figureId: number, files: File[]): Observable<Photo[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));
    return this.http.post<Photo[]>(`/api/photos/upload/${figureId}`, formData);
  }

  setPrimaryPhoto(photoId: number): Observable<Photo> {
    return this.http.put<Photo>(`/api/photos/${photoId}/primary`, {});
  }

  deletePhoto(photoId: number): Observable<void> {
    return this.http.delete<void>(`/api/photos/${photoId}`);
  }

  // Stats
  getStats(): Observable<Stats> {
    return this.http.get<Stats>('/api/stats');
  }
}
