import { describe, it, expect } from 'vitest';
import { validateHotelInput } from '../hotels.js';

describe('validateHotelInput', () => {
  it('passes on valid hotel input with all fields', () => {
    const result = validateHotelInput({
      name: 'Grand Hotel San Jose',
      address: 'Avenida Central, San Jose',
      description: 'A lovely luxury hotel located downtown.',
      locationArea: 'San Jose Centro',
      latitude: 9.9281,
      longitude: -84.0907,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.message).toBeUndefined();
  });

  it('passes on valid hotel input with coordinates omitted (null or empty)', () => {
    const result = validateHotelInput({
      name: 'Boutique Hotel',
      address: 'Calle 5, San Pedro',
      description: null,
      locationArea: null,
      latitude: '',
      longitude: '',
    });

    expect(result.valid).toBe(true);
  });

  it('rejects empty or whitespace-only name', () => {
    const result = validateHotelInput({
      name: '   ',
      address: 'Avenida 1',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.name).toBe('Hotel name is required');
    expect(result.message).toBe('Hotel name is required');
  });

  it('rejects name exceeding 100 characters', () => {
    const result = validateHotelInput({
      name: 'A'.repeat(101),
      address: 'Avenida 1',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.name).toBe('Hotel name must be between 1 and 100 characters');
  });

  it('rejects empty or whitespace-only address', () => {
    const result = validateHotelInput({
      name: 'Hotel California',
      address: '   ',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.address).toBe('Hotel address is required');
  });

  it('rejects address exceeding 200 characters', () => {
    const result = validateHotelInput({
      name: 'Hotel California',
      address: 'A'.repeat(201),
    });

    expect(result.valid).toBe(false);
    expect(result.errors.address).toBe('Hotel address must be between 1 and 200 characters');
  });

  it('rejects description exceeding 500 characters', () => {
    const result = validateHotelInput({
      name: 'Hotel California',
      address: 'Avenida 1',
      description: 'D'.repeat(501),
    });

    expect(result.valid).toBe(false);
    expect(result.errors.description).toBe('Description must be at most 500 characters');
  });

  it('rejects location area exceeding 100 characters', () => {
    const result = validateHotelInput({
      name: 'Hotel California',
      address: 'Avenida 1',
      locationArea: 'L'.repeat(101),
    });

    expect(result.valid).toBe(false);
    expect(result.errors.locationArea).toBe('Location area must be at most 100 characters');
  });

  it('rejects when only one coordinate is provided (latitude without longitude)', () => {
    const result = validateHotelInput({
      name: 'Hotel California',
      address: 'Avenida 1',
      latitude: 9.9281,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.coordinates).toBe('Both latitude and longitude must be provided together');
  });

  it('rejects when only one coordinate is provided (longitude without latitude)', () => {
    const result = validateHotelInput({
      name: 'Hotel California',
      address: 'Avenida 1',
      longitude: -84.0907,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.coordinates).toBe('Both latitude and longitude must be provided together');
  });

  it('rejects latitude out of range (> 90 or < -90, e.g. 95)', () => {
    const result = validateHotelInput({
      name: 'Hotel California',
      address: 'Avenida 1',
      latitude: 95,
      longitude: -84.0907,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.latitude).toBe('Latitude must be between -90 and 90');
  });

  it('rejects longitude out of range (> 180 or < -180, e.g. -190)', () => {
    const result = validateHotelInput({
      name: 'Hotel California',
      address: 'Avenida 1',
      latitude: 9.9281,
      longitude: -190,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.longitude).toBe('Longitude must be between -180 and 180');
  });

  it('allows partial input for updates when isUpdate=true', () => {
    const result = validateHotelInput(
      {
        description: 'Updated description',
      },
      { isUpdate: true }
    );

    expect(result.valid).toBe(true);
  });
});
