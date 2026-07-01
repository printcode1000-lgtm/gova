export interface ProfileSpecialtiesSelection {
  main: number[];
  sub: Record<string, number[]>;
}

export interface SaveProfileSpecialtiesInput extends ProfileSpecialtiesSelection {
  uid: string;
}

export const EMPTY_PROFILE_SPECIALTIES: ProfileSpecialtiesSelection = {
  main: [],
  sub: {},
};
