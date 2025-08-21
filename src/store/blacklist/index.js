import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getBlackList } from "../api";

// Async thunk to fetch blacklist data
export const fetchBlacklistData = createAsyncThunk(
  'blacklist/fetchData',
  async () => {
    const result = await getBlackList();
    
    // Process the data similar to how it's done in the components
    const genesUp = {};
    const genesDown = {};
    const genesUpExp = {};
    const genesDownExp = {};

    for (const gene in result.blacklist.ZS) {
      if (result.blacklist.ZS[gene] > 0) {
        genesUp[gene] = result.blacklist.ZS[gene];
      } else {
        genesDown[gene] = Math.abs(result.blacklist.ZS[gene]);
      }
    }

    for (const gene in result.blacklistExp.ZS) {
      if (result.blacklistExp.ZS[gene] > 0) {
        genesUpExp[gene] = result.blacklistExp.ZS[gene];
      } else {
        genesDownExp[gene] = Math.abs(result.blacklistExp.ZS[gene]);
      }
    }

    return {
      blackListDown: genesDown,
      blackListUp: genesUp,
      blackListExpDown: genesDownExp,
      blackListExpUp: genesUpExp,
      blackListPCount: result.blacklist.C,
      blackListECount: result.blacklistExp.C,
    };
  }
);

const initialState = {
  data: null,
  loading: false,
  error: null,
};

export const blacklistSlice = createSlice({
  name: "blacklist",
  initialState,
  reducers: {
    clearBlacklistData: (state) => {
      state.data = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlacklistData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlacklistData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchBlacklistData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        // Set default empty data on error
        state.data = {
          blackListDown: {},
          blackListUp: {},
          blackListExpDown: {},
          blackListExpUp: {},
          blackListPCount: {},
          blackListECount: {},
        };
      });
  },
});

export const { clearBlacklistData } = blacklistSlice.actions;

const blacklistReducer = blacklistSlice.reducer;

export { blacklistReducer }; 