import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import {
  useAdoptSharedVehicleMutation,
  useSearchVehiclesQuery,
  type VehicleSearchResult,
} from '@/entities/vehicle';
import { getErrorMessage } from '@/shared/lib/api';

import { getDiagnosticVehiclePath } from './paths';

const SEARCH_MIN_LENGTH = 4;

export function usePickDiagnosticVehicle() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [adoptingId, setAdoptingId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  const typedQuery = search.trim();
  const isTypingSearch = typedQuery.length >= SEARCH_MIN_LENGTH;
  const hasQuery = debouncedSearch.length >= SEARCH_MIN_LENGTH;
  const { data, isFetching, isError, refetch } = useSearchVehiclesQuery(debouncedSearch, {
    skip: !hasQuery,
  });
  const [adoptSharedVehicle] = useAdoptSharedVehicleMutation();

  const pickVehicle = async (vehicle: VehicleSearchResult) => {
    try {
      setAdoptingId(vehicle.id);
      const card = await adoptSharedVehicle({ vehicleId: vehicle.id }).unwrap();
      navigate(getDiagnosticVehiclePath(String(card.id)));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось открыть автомобиль'), {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      setAdoptingId(null);
    }
  };

  return {
    search,
    setSearch,
    hasQuery: isTypingSearch,
    isShortQuery: typedQuery.length > 0 && typedQuery.length < SEARCH_MIN_LENGTH,
    shortQueryLeft: Math.max(0, SEARCH_MIN_LENGTH - typedQuery.length),
    results: isTypingSearch && typedQuery === debouncedSearch && !isFetching ? (data ?? []) : [],
    isSearching: isTypingSearch && (typedQuery !== debouncedSearch || isFetching),
    isError,
    refetch,
    adoptingId,
    isAdopting: adoptingId !== null,
    pickVehicle,
  };
}
