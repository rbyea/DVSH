import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { User } from './types';

type SessionState = {
  user: User | null;
};

const initialState: SessionState = {
  user: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    clearSession(state) {
      state.user = null;
    },
  },
});

export const { setSession, clearSession } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
