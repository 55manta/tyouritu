export type RootStackParamList = {
  Tabs: undefined;
  CustomerDetail: { id: string };
  AddCustomer: undefined;
  AddPiano: { customerId: string };
  RecordForm: { customerId: string; pianoId: string; recordId?: string };
  Ledger: undefined;
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Schedule: undefined;
  Customers: undefined;
  Record: undefined;
  Revenue: undefined;
};
