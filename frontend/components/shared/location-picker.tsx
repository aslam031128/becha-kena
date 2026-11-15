'use client';

import React, { useState } from 'react';
import bdLocations from '@/lib/utils/bd-locations.json';

interface LocationPickerProps {
  initialDivision?: string;
  initialDistrict?: string;
  initialThana?: string;
  onChange: (location: { division: string; district: string; thana: string }) => void;
}

type BdData = Record<string, Record<string, string[]>>;
const locationsData = bdLocations as BdData;

export function LocationPicker({
  initialDivision = '',
  initialDistrict = '',
  initialThana = '',
  onChange,
}: LocationPickerProps) {
  const [division, setDivision] = useState(initialDivision);
  const [district, setDistrict] = useState(initialDistrict);
  const [thana, setThana] = useState(initialThana);

  const divisions = Object.keys(locationsData);
  const districts = division && locationsData[division] ? Object.keys(locationsData[division]) : [];
  const thanas = division && district && locationsData[division]?.[district] ? locationsData[division][district] : [];

  const handleDivisionChange = (newDivision: string) => {
    setDivision(newDivision);
    setDistrict('');
    setThana('');
    onChange({ division: newDivision, district: '', thana: '' });
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    setThana('');
    onChange({ division, district: newDistrict, thana: '' });
  };

  const handleThanaChange = (newThana: string) => {
    setThana(newThana);
    onChange({ division, district, thana: newThana });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Division */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">বিভাগ (Division)</label>
        <select
          value={division}
          onChange={(e) => handleDivisionChange(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Select Division</option>
          {divisions.map((div) => (
            <option key={div} value={div}>
              {div}
            </option>
          ))}
        </select>
      </div>

      {/* District */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">জেলা (District)</label>
        <select
          value={district}
          disabled={!division}
          onChange={(e) => handleDistrictChange(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">Select District</option>
          {districts.map((dist) => (
            <option key={dist} value={dist}>
              {dist}
            </option>
          ))}
        </select>
      </div>

      {/* Thana */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">থানা (Thana/Area)</label>
        <select
          value={thana}
          disabled={!district}
          onChange={(e) => handleThanaChange(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">Select Thana</option>
          {thanas.map((th) => (
            <option key={th} value={th}>
              {th}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

