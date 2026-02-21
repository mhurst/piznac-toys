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
  inCollection?: boolean;
  collectionNotes?: string | null;
}

export interface Accessory {
  id: number;
  name: string;
  figureId: number;
  owned?: boolean;
}

export interface Photo {
  id: number;
  filename: string;
  isPrimary: boolean;
  figureId: number;
  userId: number | null;
}

export interface FigurePage {
  figures: Figure[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserAdmin {
  id: number;
  email: string;
  name: string | null;
  role: string;
  active: boolean;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  _count: { figures: number };
}

export interface PublicProfile {
  id: number;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  _count: { figures: number };
}

export interface Stats {
  totalFigures: number;
  totalToylines: number;
  totalAccessories: number;
  userStats: {
    ownedFigures: number;
    ownedAccessories: number;
    completionPercent: number;
  } | null;
}

export interface CollectionStats {
  ownedFigures: number;
  ownedAccessories: number;
  totalAccessoriesInCollection: number;
  completionPercent: number;
}

export interface UserFigure {
  userId: number;
  figureId: number;
  notes: string | null;
  createdAt: string;
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
    toyLineId?: number;
    seriesId?: number;
    tagIds?: number[];
  }): Observable<Figure> {
    return this.http.put<Figure>(`/api/figures/${id}`, data);
  }

  deleteFigure(id: number): Observable<void> {
    return this.http.delete<void>(`/api/figures/${id}`);
  }

  // Accessories (catalog management — admin only)
  addAccessory(figureId: number, name: string): Observable<Accessory> {
    return this.http.post<Accessory>(`/api/figures/${figureId}/accessories`, { name });
  }

  updateAccessory(id: number, data: { name?: string }): Observable<Accessory> {
    return this.http.put<Accessory>(`/api/figures/accessories/${id}`, data);
  }

  deleteAccessory(id: number): Observable<void> {
    return this.http.delete<void>(`/api/figures/accessories/${id}`);
  }

  // Photos
  uploadPhotos(figureId: number, files: File[], catalog = false): Observable<Photo[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));
    if (catalog) formData.append('catalog', 'true');
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

  // Collection
  getMyCollection(params: {
    toylineId?: number;
    seriesId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<FigurePage> {
    let httpParams = new HttpParams();
    if (params.toylineId) httpParams = httpParams.set('toylineId', params.toylineId.toString());
    if (params.seriesId) httpParams = httpParams.set('seriesId', params.seriesId.toString());
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<FigurePage>('/api/collection', { params: httpParams });
  }

  getCollectionStats(): Observable<CollectionStats> {
    return this.http.get<CollectionStats>('/api/collection/stats');
  }

  addToCollection(figureId: number, notes?: string): Observable<UserFigure> {
    return this.http.post<UserFigure>(`/api/collection/figures/${figureId}`, { notes });
  }

  removeFromCollection(figureId: number): Observable<void> {
    return this.http.delete<void>(`/api/collection/figures/${figureId}`);
  }

  updateCollectionNotes(figureId: number, notes: string): Observable<UserFigure> {
    return this.http.put<UserFigure>(`/api/collection/figures/${figureId}`, { notes });
  }

  toggleAccessoryOwned(accessoryId: number, owned: boolean): Observable<any> {
    if (owned) {
      return this.http.post(`/api/collection/accessories/${accessoryId}`, {});
    } else {
      return this.http.delete(`/api/collection/accessories/${accessoryId}`);
    }
  }

  // Users
  getUsers(): Observable<UserAdmin[]> {
    return this.http.get<UserAdmin[]>('/api/users');
  }

  updateUserRole(id: number, role: string): Observable<any> {
    return this.http.put(`/api/users/${id}/role`, { role });
  }

  updateUserStatus(id: number, active: boolean): Observable<any> {
    return this.http.put(`/api/users/${id}/status`, { active });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`/api/users/${id}`);
  }

  getPublicCollection(userId: number, params: {
    toylineId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<FigurePage> {
    let httpParams = new HttpParams();
    if (params.toylineId) httpParams = httpParams.set('toylineId', params.toylineId.toString());
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<FigurePage>(`/api/users/${userId}/collection`, { params: httpParams });
  }

  getPublicProfile(id: number): Observable<PublicProfile> {
    return this.http.get<PublicProfile>(`/api/users/${id}`);
  }

  uploadAvatar(file: File): Observable<{ avatar: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<{ avatar: string }>('/api/users/avatar', formData);
  }

  deleteAvatar(): Observable<void> {
    return this.http.delete<void>('/api/users/avatar');
  }

  updateBio(bio: string): Observable<{ bio: string | null }> {
    return this.http.put<{ bio: string | null }>('/api/users/bio', { bio });
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/forgot-password', { email });
  }

  resetPassword(email: string, token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/reset-password', { email, token, newPassword });
  }
}
