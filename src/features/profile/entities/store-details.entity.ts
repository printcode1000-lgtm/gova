export interface StoreDetailsData {
  storeName: string;
  storeDescription: string;
  storeStory: string;
}

export const EMPTY_STORE_DETAILS: StoreDetailsData = {
  storeName: '',
  storeDescription: '',
  storeStory: '',
};

export interface SaveStoreDetailsInput extends StoreDetailsData {
  uid: string;
}
