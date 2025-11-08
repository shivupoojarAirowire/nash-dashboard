export interface StoreData {
  city: string;
  store: string;
  storeCode: string;
}

export const stores: StoreData[] = [
  // Mumbai stores
  { city: "MUMBAI", store: "MUM-KOTHARI COMPOUND NEW", storeCode: "MUM_KOTARI_P01R1CC" },
  { city: "MUMBAI", store: "MUM-Bhandup New", storeCode: "MUM_BHNDUP_P01R1CC" },
  { city: "MUMBAI", store: "MUM-Dombivali W New", storeCode: "MUM_DBM(W)_P01R1CC" },
  { city: "MUMBAI", store: "MUM-Kharghar New", storeCode: "MUM_KHRGHR_P01R1CF" },
  { city: "MUMBAI", store: "MUM-Belapur New", storeCode: "MUM_BELAPR_P01R1CC" },
  { city: "MUMBAI", store: "MUM-Vile parle", storeCode: "MUM_VLEPRL_P01R0CC" },
  { city: "MUMBAI", store: "MUM-Goregaon E Network New", storeCode: "MUM_GRG(E)_N01R1CC" },
  { city: "MUMBAI", store: "MUM-Nalasopara", storeCode: "MUM_NALSPR_P01R0CC" },
  { city: "MUMBAI", store: "MUM-BKC NW New", storeCode: "MUM_BKC_N01R1CC" },
  { city: "MUMBAI", store: "MUM-Vashi Network 2", storeCode: "MUM_VASHI_N02R0CC" },
  { city: "MUMBAI", store: "MUM-KOTHARI COMPOUND Network 1", storeCode: "MUM_KOTARI_N01R1CC" },
  { city: "MUMBAI", store: "MUM-Mulund East", storeCode: "MUM_MLD(E)_P01R0CC" },
  { city: "MUMBAI", store: "MUM-Shivai Nagar", storeCode: "MUM_KOTARI_N02R0CC" },
  { city: "MUMBAI", store: "MUM-Nalasopara West", storeCode: "MUM_NLSPRW_P01R0CC" },
  { city: "MUMBAI", store: "MUM-Manjarli", storeCode: "MUM_MNJRLI_P01R0CC" },
  { city: "MUMBAI", store: "MUM-Dahanu", storeCode: "MUM_DAHANU_P01R0CC" },
  { city: "MUMBAI", store: "MUM-Boisar", storeCode: "MUM_BOISAR_P01R0CC" },
  { city: "MUMBAI", store: "MUM-Mharal", storeCode: "MUM_MHARAL_P01R0CC" },
  { city: "MUMBAI", store: "MUM-Palghar", storeCode: "MUM_PALGHR_P01R0CC" },
  { city: "MUMBAI", store: "MUM-Mumbai Central SS", storeCode: "MUM_MUMCEN_SS1R0CC" },
  { city: "MUMBAI", store: "MUM-Chembur SS", storeCode: "MUM_CHMBUR_SS1R0CC" },
  { city: "MUMBAI", store: "MUM-Kothari Compound SS", storeCode: "MUM_KOTARI_SS1R0CC" },
  { city: "MUMBAI", store: "MUM-Panvel SS", storeCode: "MUM_PANVEL_SS1R0CC" },
  { city: "MUMBAI", store: "MUM-Bandra SS", storeCode: "MUM_BANDRA_SS1R0CC" },
  { city: "MUMBAI", store: "MUM-Borivali SS", storeCode: "MUM_BORVLI_SS1R0CC" },

  // Bengaluru stores
  { city: "BENGALURU", store: "BLR-Sarjapur New", storeCode: "BLR_SRJPUR_P01R1CC" },
  { city: "BENGALURU", store: "BLR-BROOKEFIELD", storeCode: "BLR_BRKFLD_P01R0CC" },
  { city: "BENGALURU", store: "BLR-Mico layout New", storeCode: "BLR_MCOLYT_P01R1CC" },
  { city: "BENGALURU", store: "BLR-CV RAMAN NAGAR NEW", storeCode: "BLR_CVRNGR_P01R1CC" },
  { city: "BENGALURU", store: "BLR-Kothnur New", storeCode: "BLR_KTHNUR_P01R1CC" },
  { city: "BENGALURU", store: "BLR-Electronic City New", storeCode: "BLR_ELCCTY_P01R1CC" },
  { city: "BENGALURU", store: "BLR-Doddakannelli", storeCode: "BLR_SRJPUR_N01R0FF" },
  { city: "BENGALURU", store: "BLR-Kannamangala", storeCode: "BLR_KNMGLA_P01R0FF" },
  { city: "BENGALURU", store: "BLR-Vidyaranyapura", storeCode: "BLR_VDYPRA_P01R0CC" },
  { city: "BENGALURU", store: "BLR-Bellandur-5", storeCode: "BLR_BLNDUR_N04R0CC" },
  { city: "BENGALURU", store: "BLR-Vijay Nagar SS", storeCode: "BLR_VIJNGR_SS1R0CC" },
  { city: "BENGALURU", store: "BLR-Hope Farm SS", storeCode: "BLR_HPEFRM_SS1R0CC" },
  { city: "BENGALURU", store: "BLR-HSR SS", storeCode: "BLR_HSRLYT_SS1R0CC" },
  { city: "BENGALURU", store: "BLR-Bannerghatta SS", storeCode: "BLR_BNRGTA_SS1R0CC" },
  { city: "BENGALURU", store: "BLR-BASAVANAPURA SS", storeCode: "BLR_BSNPUR_SS1R0CC" },
  { city: "BENGALURU", store: "BLR-Malleshwaram SS", storeCode: "BLR_MLSWRM_SS1R0CC" },

  // Delhi stores
  { city: "DELHI", store: "DEL-JANAKPURI", storeCode: "DEL_JNKPRI_P01R0CF" },
  { city: "DELHI", store: "DEL-UTTAM NAGAR New", storeCode: "DEL_UTMNGR_P01R1CC" },
  { city: "DELHI", store: "DEL-Dilshad Garden New", storeCode: "DEL_DLSGRD_P01R1CC" },
  { city: "DELHI", store: "Del-Dwarka Sector 19", storeCode: "DEL_DWARKA_N02R0FF" },
  { city: "DELHI", store: "DEL-Neb Sarai", storeCode: "DEL_NEBSAR_P01R0CF" },
  { city: "DELHI", store: "DEL-Pitampura network", storeCode: "DEL_PTMPUR_N01R0FF" },
  { city: "DELHI", store: "DEL-Model Town SS", storeCode: "DEL_MDLTWN_SS1R0CC" },
  { city: "DELHI", store: "DEL-Dilshad Garden SS", storeCode: "DEL_DLSGRD_SS1R0CC" },
  { city: "DELHI", store: "DEL-Vikaspuri SS", storeCode: "DEL_VKSPUR_SS1R0CC" },
  { city: "DELHI", store: "DEL-Neb Sarai SS", storeCode: "DEL_NEBSAR_SS1R0CC" },
  { city: "DELHI", store: "DEL-IP Extension SS", storeCode: "DEL_IPEXTN_SS1R0CC" },
  { city: "DELHI", store: "DEL-Kirti Nagar SS", storeCode: "DEL_KRTNGR_SS1R0CC" },
  { city: "DELHI", store: "DEL-Vasantkunj SS", storeCode: "DEL_VSNTKJ_SS1R0CC" },
  { city: "DELHI", store: "DEL-Rohini Sec 21 SS", storeCode: "DEL_ROHINI_SS3R0CC" },
  { city: "DELHI", store: "DEL-Kalkaji SS", storeCode: "DEL_KLKAJI_SS1R0CC" },

  // Hyderabad stores
  { city: "HYDERABAD", store: "HYD-SECUNDERABAD", storeCode: "HYD_SCNDBD_P01R0CC" },
  { city: "HYDERABAD", store: "HYD-Chandanagar New", storeCode: "HYD_CHDNGR_P01R1CC" },
  { city: "HYDERABAD", store: "HYD-HimayatNagar New", storeCode: "HYD_HMYTNG_P01R1CC" },
  { city: "HYDERABAD", store: "HYD-KOTHAPET New", storeCode: "HYD_KOTHPT_P01R1CC" },
  { city: "HYDERABAD", store: "HYD-Vivekananda nagar New", storeCode: "HYD_VKDNGR_P01R1CC" },
  { city: "HYDERABAD", store: "HYD-Bachupally New", storeCode: "HYD_BCHPLY_P01R1CC" },
  { city: "HYDERABAD", store: "HYD-MUSHEERABAD", storeCode: "HYD_MSHBAD_P01R0CC" },
  { city: "HYDERABAD", store: "HYD-Manikonda Network", storeCode: "HYD_MNKOND_N01R0CC" },
  { city: "HYDERABAD", store: "HYD-HimayatNagar SS", storeCode: "HYD_HMYTNG_SS1R0CC" },
  { city: "HYDERABAD", store: "HYD-Nizampet SS", storeCode: "HYD_NZMPET_SS1R0CC" },
  { city: "HYDERABAD", store: "HYD-Kothapet SS", storeCode: "HYD_KOTHPT_SS1R0CC" },
  { city: "HYDERABAD", store: "HYD-Moosapet SS", storeCode: "HYD_MOSAPT_SS1R0CC" },
  { city: "HYDERABAD", store: "HYD-Gudimalkapur SS", storeCode: "HYD_GDMKPR_SS1R0CC" }
];

// Helper function to get stores by city
export function getStoresByCity(city: string): StoreData[] {
  return stores.filter(store => store.city.toLowerCase() === city.toLowerCase());
}

// Helper function to get store details by store name
export function getStoreDetails(storeName: string): StoreData | undefined {
  return stores.find(store => store.store.toLowerCase() === storeName.toLowerCase());
}

// Get unique list of cities
export function getUniqueCities(): string[] {
  return Array.from(new Set(stores.map(store => store.city)));
}