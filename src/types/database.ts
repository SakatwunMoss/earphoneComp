export type Earphone = {
  id: string;
  name: string;
  brand: string;
  price: number;
  form_factor: string;
  released_year: number;
  description: string | null;
  url: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      earphones: {
        Row: Earphone;
        Insert: Omit<Earphone, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Earphone, "id">>;
      };
    };
  };
};
