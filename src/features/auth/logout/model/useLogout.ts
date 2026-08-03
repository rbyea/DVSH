import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@/app/store';
import { clearSession, useLogoutMutation } from '@/entities/session';
import { baseApi } from '@/shared/api';
import { clearAccessToken } from '@/shared/lib/auth';

export function useLogout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logoutMutation, { isLoading }] = useLogoutMutation();

  const logout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // Clear local session even if the API call fails.
    } finally {
      clearAccessToken();
      dispatch(clearSession());
      dispatch(baseApi.util.resetApiState());
      navigate('/login', { replace: true });
    }
  };

  return {
    logout,
    isLoading,
  };
}
