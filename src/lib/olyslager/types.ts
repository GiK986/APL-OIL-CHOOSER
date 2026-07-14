export interface Category {
  id: number;
  appOrder: number;
  categoryName: string;
  typeYearStart: number;
  typeYearEnd: number | null;
}

export interface Make {
  id: number;
  appOrder: number;
  makeName: string;
  imageUrlSmall: string | null;
  imageUrlMedium: string | null;
  imageUrlLarge: string | null;
  typeYearStart: number;
  typeYearEnd: number | null;
}

export interface Model {
  id: number;
  appOrder: number;
  modelName: string;
  code: string | null;
  yearStart: number;
  yearEnd: number | null;
  imageUrlSmall: string | null;
  imageUrlMedium: string | null;
  imageUrlLarge: string | null;
  typeYearStart: number;
  typeYearEnd: number | null;
}

export interface VehicleType {
  id: number;
  appOrder: number;
  typeName: string;
  code: string | null;
  yearStart: number;
  yearEnd: number | null;
  fuel: string | null;
  driveType: string | null;
  cylinderCC: number | null;
  engineBuild: string | null;
  powerHP: number | null;
  powerKW: number | null;
  powerRPM: number | null;
  valveCount: number | null;
  cylinderCount: number | null;
  modelImageUrlSmall: string | null;
  modelImageUrlMedium: string | null;
  modelImageUrlLarge: string | null;
  makeImageUrlSmall: string | null;
  makeImageUrlMedium: string | null;
  makeImageUrlLarge: string | null;
}

export interface ProductInterval {
  intervalName: string;
  intervalType: string;
}

export interface ProductRecommendation {
  productName: string;
  productCode: string | null;
  temperatureName: string | null;
  useName: string | null;
  intervals: ProductInterval[];
  approvalClassifications: string[] | null;
}

export interface Capacity {
  item: string;
  value: number | string;
  unit: string;
  condition: string | null;
}

export interface RecommendationComponent {
  id: number;
  componentName: string;
  componentCode: string | null;
  componentCategoryId: number | null;
  productRecommendations: ProductRecommendation[];
  capacities: Capacity[];
}

export interface Recommendation {
  categoryId: number;
  categoryName: string;
  makeId: number;
  makeName: string;
  modelId: number;
  modelName: string;
  modelCode: string | null;
  modelYearStart: number;
  modelYearEnd: number | null;
  id: number;
  typeName: string;
  code: string | null;
  yearStart: number;
  yearEnd: number | null;
  fuel: string | null;
  driveType: string | null;
  cylinderCC: number | null;
  engineBuild: string | null;
  powerHP: number | null;
  powerKW: number | null;
  powerRPM: number | null;
  valveCount: number | null;
  cylinderCount: number | null;
  modelImageUrlSmall: string | null;
  modelImageUrlMedium: string | null;
  modelImageUrlLarge: string | null;
  makeImageUrlSmall: string | null;
  makeImageUrlMedium: string | null;
  makeImageUrlLarge: string | null;
  components: RecommendationComponent[];
}

export interface SearchFacetValue {
  value: string;
  count: number;
}

export interface SearchFacet {
  facet:
    | "powerhp"
    | "model"
    | "cilindercapacity"
    | "fuel"
    | "years"
    | "powerkw"
    | "drivetype"
    | "category"
    | "make";
  values: SearchFacetValue[];
}

export interface SearchResult {
  typeId: number;
  category: string;
  make: string;
  model: string;
  modelCode: string | null;
  type: string;
  typeCode: string | null;
  yearStart: number;
  yearEnd: number | null;
  fuel: string | null;
  driveType: string | null;
  cilinderCapacity: string | null;
  powerHp: string | null;
  powerKw: string | null;
  engineCode: string | null;
  modelImageUrlSmall: string | null;
  modelImageUrlMedium: string | null;
  modelImageUrlLarge: string | null;
}

export interface SearchResponse {
  facets: SearchFacet[];
  results: SearchResult[];
  searchTypes: string[] | null;
}

export interface OlyslagerEnvelope<T> {
  success: boolean;
  statusCode: number;
  resultData: T;
  message: string | null;
}
