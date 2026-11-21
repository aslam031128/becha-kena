import { ListingCategory } from '@/types/listing.types';

export interface DivisionData {
  id: string;
  name: string;
  thanas: string[];
}

export interface CategoryInfo {
  id: ListingCategory;
  label: string;
  icon: string;
}

export const BD_DIVISIONS: DivisionData[] = [
  {
    id: 'dhaka',
    name: 'Dhaka',
    thanas: [
      'Dhanmondi',
      'Gulshan',
      'Banani',
      'Mirpur',
      'Uttara',
      'Mohammadpur',
      'Motijheel',
      'Lalbagh',
      'Farmgate',
      'Jatrabari',
      'Badda',
      'Khilgaon',
      'Tejgaon',
      'Ramna',
      'Paltan',
    ],
  },
  {
    id: 'chittagong',
    name: 'Chittagong',
    thanas: [
      'Agrabad',
      'Nasirabad',
      'Chawkbazar',
      'Pahartali',
      'Halishahar',
      'Kotwali',
      'Khulshi',
      'Patenga',
      'Double Mooring',
      'Bakalia',
    ],
  },
  {
    id: 'rajshahi',
    name: 'Rajshahi',
    thanas: ['Boalia', 'Motihar', 'Rajpara', 'Shah Makhdum', 'Paba', 'Durgapur'],
  },
  {
    id: 'khulna',
    name: 'Khulna',
    thanas: ['Khalishpur', 'Daulatpur', 'Sonadanga', 'Kotwali', 'Khan Jahan Ali'],
  },
  {
    id: 'barisal',
    name: 'Barisal',
    thanas: ['Kotwali', 'Airport', 'Kawnia', 'Bakerganj', 'Babuganj'],
  },
  {
    id: 'sylhet',
    name: 'Sylhet',
    thanas: ['Kotwali', 'Jalalabad', 'Airport', 'South Surma', 'Osmani Nagar'],
  },
  {
    id: 'rangpur',
    name: 'Rangpur',
    thanas: ['Kotwali', 'Tajhat', 'Mahiganj', 'Haragach', 'Parshuram'],
  },
  {
    id: 'mymensingh',
    name: 'Mymensingh',
    thanas: ['Kotwali', 'Muktagachha', 'Fulbaria', 'Trishal', 'Bhaluka'],
  },
];

export const CATEGORIES: CategoryInfo[] = [
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
  { id: 'property', label: 'Property', icon: '🏠' },
  { id: 'fashion', label: 'Fashion', icon: '👕' },
  { id: 'home', label: 'Home', icon: '🏡' },
  { id: 'hobbies', label: 'Hobbies', icon: '⚽' },
];

export const BANGLADESH_BOUNDS = {
  minLat: 20.57,
  maxLat: 26.63,
  minLng: 88.01,
  maxLng: 92.67,
};

export function isInBangladesh(lat: number, lng: number): boolean {
  return (
    lat >= BANGLADESH_BOUNDS.minLat &&
    lat <= BANGLADESH_BOUNDS.maxLat &&
    lng >= BANGLADESH_BOUNDS.minLng &&
    lng <= BANGLADESH_BOUNDS.maxLng
  );
}

export function getThanasForDivision(divisionName?: string): string[] {
  if (!divisionName) return [];
  const found = BD_DIVISIONS.find(
    (d) => d.name.toLowerCase() === divisionName.trim().toLowerCase()
  );
  return found ? found.thanas : [];
}
