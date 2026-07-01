"use client";

import * as React from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GOVA_API_ROUTES, govaApi } from "@/core/api";
import {
  PharmacySpecifications,
  ProductActions,
  ProductImages,
  ProductMainData,
  ProductPrice,
  ProductRating,
  ProductSpecifications,
  PropertySpecifications,
  VehicleSpecifications,
  type ProductPreviewMode,
} from "@/components/product-preview";

const MEDICAL_SERVICES_CATEGORY_ID = 20;
const DOCTOR_APPOINTMENT_VALUE = "doctor-appointment";

interface Category {
  id: number;
  title_ar: string;
  title_en: string;
  collection: number | null;
  collection_ar: string | null;
  collection_en: string | null;
  order: number | null;
}

interface Subcategory {
  id: number;
  category_id: number;
  original_id: number;
  title_ar: string;
  title_en: string;
  sub_collection: number | string | null;
}

interface MainCategoryOption {
  id: number;
  titleAr: string;
  titleEn: string;
  isCollection: boolean;
  order: number | null;
}

interface SubcategoryOption {
  value: string;
  titleAr: string;
  titleEn: string;
}

type DetailRecord = Record<string, unknown>;

interface ProductStyleSettings {
  mainCategoryId: string;
  subcategoryId: string;
  components: {
    images: {
      visible: boolean;
      count: number;
      order: number;
    };
    rating: {
      visible: boolean;
      type: "stars" | "stars-comments";
      order: number;
    };
    price: {
      visible: boolean;
      current: boolean;
      beforeDiscount: boolean;
      needsCar: boolean;
      order: number;
    };
    order: {
      visible: boolean;
      cart: boolean;
      favorite: boolean;
      contact: boolean;
      order: number;
    };
    mainData: {
      visible: boolean;
      name: boolean;
      brand: boolean;
      manufacturer: boolean;
      available: boolean;
      description: boolean;
      order: number;
    };
    specifications: {
      visible: boolean;
      color: boolean;
      dimensions: boolean;
      condition: boolean;
      size: boolean;
      weight: boolean;
      year: boolean;
      order: number;
    };
    vehicleSpecs: {
      visible: boolean;
      brand: boolean;
      bodyType: boolean;
      fuel: boolean;
      transmission: boolean;
      order: number;
    };
    propertySpecs: {
      visible: boolean;
      area: boolean;
      rooms: boolean;
      bathrooms: boolean;
      type: boolean;
      address: boolean;
      location: boolean;
      finishing: boolean;
      order: number;
    };
    pharmacySpecs: {
      visible: boolean;
      nameAr: boolean;
      nameEn: boolean;
      form: boolean;
      concentration: boolean;
      activeIngredient: boolean;
      order: number;
    };
  };
}

interface ProductStyleResponse {
  exists: boolean;
  settings: ProductStyleSettings | null;
}

function bilingualLabel(titleAr: string, titleEn: string) {
  return titleEn ? `${titleAr} — ${titleEn}` : titleAr;
}

function formatDetailValue(value: unknown) {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function SelectedRecordDetails({
  title,
  record,
}: {
  title: string;
  record: DetailRecord | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-background/70">
      <h3 className="border-b px-4 py-3 text-sm font-bold">{title}</h3>
      {record ? (
        <dl className="divide-y text-sm">
          {Object.entries(record).map(([key, value]) => (
            <div
              key={key}
              className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(130px,0.4fr)_1fr] sm:gap-4"
            >
              <dt
                className="font-mono text-xs font-semibold text-primary"
                dir="ltr"
              >
                {key}
              </dt>
              <dd
                className="break-all whitespace-pre-wrap text-muted-foreground"
                dir="auto"
              >
                {formatDetailValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          لم يتم الاختيار بعد.
        </p>
      )}
    </div>
  );
}

export function DeveloperCategorySelector() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [subcategories, setSubcategories] = React.useState<Subcategory[]>([]);
  const [mainCategoryId, setMainCategoryId] = React.useState("");
  const [subcategoryId, setSubcategoryId] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [showImages, setShowImages] = React.useState(true);
  const [imagesCount, setImagesCount] = React.useState("4");
  const [imagesOrder, setImagesOrder] = React.useState("1");
  const [ratingVisible, setRatingVisible] = React.useState(true);
  const [ratingType, setRatingType] = React.useState<
    "stars" | "stars-comments"
  >("stars-comments");
  const [ratingOrder, setRatingOrder] = React.useState("2");
  const [priceVisible, setPriceVisible] = React.useState(true);
  const [priceCurrent, setPriceCurrent] = React.useState(true);
  const [priceBeforeDiscount, setPriceBeforeDiscount] = React.useState(true);
  const [priceNeedsCar, setPriceNeedsCar] = React.useState(true);
  const [priceOrder, setPriceOrder] = React.useState("3");
  const [orderVisible, setOrderVisible] = React.useState(true);
  const [orderCart, setOrderCart] = React.useState(true);
  const [orderFavorite, setOrderFavorite] = React.useState(true);
  const [orderContact, setOrderContact] = React.useState(true);
  const [orderOrder, setOrderOrder] = React.useState("4");
  const [mainDataVisible, setMainDataVisible] = React.useState(true);
  const [mainDataName, setMainDataName] = React.useState(true);
  const [mainDataBrand, setMainDataBrand] = React.useState(true);
  const [mainDataManufacturer, setMainDataManufacturer] = React.useState(true);
  const [mainDataAvailable, setMainDataAvailable] = React.useState(true);
  const [mainDataDescription, setMainDataDescription] = React.useState(true);
  const [mainDataOrder, setMainDataOrder] = React.useState("5");
  const [specsVisible, setSpecsVisible] = React.useState(true);
  const [specsColor, setSpecsColor] = React.useState(true);
  const [specsDimensions, setSpecsDimensions] = React.useState(true);
  const [specsCondition, setSpecsCondition] = React.useState(true);
  const [specsSize, setSpecsSize] = React.useState(true);
  const [specsWeight, setSpecsWeight] = React.useState(true);
  const [specsYear, setSpecsYear] = React.useState(true);
  const [specsOrder, setSpecsOrder] = React.useState("6");
  const [vehicleSpecsVisible, setVehicleSpecsVisible] = React.useState(false);
  const [vehicleSpecsBrand, setVehicleSpecsBrand] = React.useState(true);
  const [vehicleSpecsBodyType, setVehicleSpecsBodyType] = React.useState(true);
  const [vehicleSpecsFuel, setVehicleSpecsFuel] = React.useState(true);
  const [vehicleSpecsTransmission, setVehicleSpecsTransmission] =
    React.useState(true);
  const [vehicleSpecsOrder, setVehicleSpecsOrder] = React.useState("7");
  const [propertySpecsVisible, setPropertySpecsVisible] = React.useState(false);
  const [propertySpecsArea, setPropertySpecsArea] = React.useState(true);
  const [propertySpecsRooms, setPropertySpecsRooms] = React.useState(true);
  const [propertySpecsBathrooms, setPropertySpecsBathrooms] =
    React.useState(true);
  const [propertySpecsType, setPropertySpecsType] = React.useState(true);
  const [propertySpecsAddress, setPropertySpecsAddress] = React.useState(true);
  const [propertySpecsLocation, setPropertySpecsLocation] =
    React.useState(true);
  const [propertySpecsFinishing, setPropertySpecsFinishing] =
    React.useState(true);
  const [propertySpecsOrder, setPropertySpecsOrder] = React.useState("8");
  const [pharmacySpecsVisible, setPharmacySpecsVisible] = React.useState(false);
  const [pharmacySpecsNameAr, setPharmacySpecsNameAr] = React.useState(true);
  const [pharmacySpecsNameEn, setPharmacySpecsNameEn] = React.useState(true);
  const [pharmacySpecsForm, setPharmacySpecsForm] = React.useState(true);
  const [pharmacySpecsConcentration, setPharmacySpecsConcentration] =
    React.useState(true);
  const [pharmacySpecsActiveIngredient, setPharmacySpecsActiveIngredient] =
    React.useState(true);
  const [pharmacySpecsOrder, setPharmacySpecsOrder] = React.useState("9");
  const [isStyleLoaded, setIsStyleLoaded] = React.useState(false);
  const [styleStatus, setStyleStatus] = React.useState<
    "idle" | "loading" | "saving" | "saved" | "error"
  >("idle");
  const [previewMode, setPreviewMode] =
    React.useState<ProductPreviewMode>("view");

  React.useEffect(() => {
    let cancelled = false;

    Promise.all([
      govaApi.getPublicJson<Category[]>("/catagory/categories.json"),
      govaApi.getPublicJson<Subcategory[]>("/catagory/subcategories.json"),
    ])
      .then(([categoryData, subcategoryData]) => {
        if (cancelled) return;
        setCategories(categoryData);
        setSubcategories(subcategoryData);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const mainCategoryOptions = React.useMemo<MainCategoryOption[]>(() => {
    const options = new Map<string, MainCategoryOption>();

    categories.forEach((category) => {
      if (category.collection === null) {
        options.set(`category-${category.id}`, {
          id: category.id,
          titleAr: category.title_ar,
          titleEn: category.title_en,
          isCollection: false,
          order: category.order,
        });
        return;
      }

      const key = `collection-${category.collection}`;
      if (!options.has(key)) {
        options.set(key, {
          id: category.collection,
          titleAr: category.collection_ar ?? "",
          titleEn: category.collection_en ?? "",
          isCollection: true,
          order: category.order,
        });
      }
    });

    return [...options.values()].sort(
      (left, right) => (left.order ?? Infinity) - (right.order ?? Infinity),
    );
  }, [categories]);

  const selectedMainCategory = mainCategoryOptions.find(
    (category) => category.id.toString() === mainCategoryId,
  );

  const subcategoryOptions = React.useMemo<SubcategoryOption[]>(() => {
    if (!selectedMainCategory) return [];

    if (selectedMainCategory.isCollection) {
      return categories
        .filter((category) => category.collection === selectedMainCategory.id)
        .sort(
          (left, right) => (left.order ?? Infinity) - (right.order ?? Infinity),
        )
        .map((category) => ({
          value: category.id.toString(),
          titleAr: category.title_ar,
          titleEn: category.title_en,
        }));
    }

    const items = subcategories.filter(
      (subcategory) => subcategory.category_id === selectedMainCategory.id,
    );

    if (selectedMainCategory.id === MEDICAL_SERVICES_CATEGORY_ID) {
      const visibleItems = items.filter(
        (subcategory) => subcategory.sub_collection !== 0,
      );
      const hasDoctorAppointmentItems = items.some(
        (subcategory) => subcategory.sub_collection === 0,
      );

      return [
        ...(hasDoctorAppointmentItems
          ? [
              {
                value: DOCTOR_APPOINTMENT_VALUE,
                titleAr: "كشف طبي",
                titleEn: "Doctor Appointment",
              },
            ]
          : []),
        ...visibleItems.map((subcategory) => ({
          value: subcategory.original_id.toString(),
          titleAr: subcategory.title_ar,
          titleEn: subcategory.title_en,
        })),
      ];
    }

    return items.map((subcategory) => ({
      value: subcategory.original_id.toString(),
      titleAr: subcategory.title_ar,
      titleEn: subcategory.title_en,
    }));
  }, [categories, selectedMainCategory, subcategories]);

  const selectedMainDetails = React.useMemo<DetailRecord | null>(() => {
    if (!selectedMainCategory) return null;

    if (!selectedMainCategory.isCollection) {
      const category = categories.find(
        (item) =>
          item.id === selectedMainCategory.id && item.collection === null,
      );
      return category ? (category as unknown as DetailRecord) : null;
    }

    const collectionItems = categories.filter(
      (item) => item.collection === selectedMainCategory.id,
    );
    const firstItem = collectionItems[0];

    return {
      id: selectedMainCategory.id,
      category_id: null,
      original_id: null,
      title_ar: selectedMainCategory.titleAr,
      title_en: selectedMainCategory.titleEn,
      collection: selectedMainCategory.id,
      collection_ar: firstItem?.collection_ar ?? selectedMainCategory.titleAr,
      collection_en: firstItem?.collection_en ?? selectedMainCategory.titleEn,
      collection_image:
        (firstItem as unknown as DetailRecord | undefined)?.collection_image ??
        null,
      order: selectedMainCategory.order,
      is_collection: true,
      collection_item_ids: collectionItems.map((item) => item.id),
      collection_items_count: collectionItems.length,
    };
  }, [categories, selectedMainCategory]);

  const selectedSubcategoryDetails = React.useMemo<DetailRecord | null>(() => {
    if (!selectedMainCategory || !subcategoryId) return null;

    if (selectedMainCategory.isCollection) {
      const category = categories.find(
        (item) => item.id.toString() === subcategoryId,
      );
      return category ? (category as unknown as DetailRecord) : null;
    }

    if (subcategoryId === DOCTOR_APPOINTMENT_VALUE) {
      const appointmentItems = subcategories.filter(
        (item) =>
          item.category_id === MEDICAL_SERVICES_CATEGORY_ID &&
          item.sub_collection === 0,
      );

      return {
        id: DOCTOR_APPOINTMENT_VALUE,
        category_id: MEDICAL_SERVICES_CATEGORY_ID,
        original_id: null,
        sub_collection: 0,
        title_ar: "كشف طبي",
        title_en: "Doctor Appointment",
        image: "doctors_appointment.webp",
        is_virtual_group: true,
        grouped_original_ids: appointmentItems.map((item) => item.original_id),
        grouped_items_count: appointmentItems.length,
      };
    }

    const subcategory = subcategories.find(
      (item) =>
        item.category_id === selectedMainCategory.id &&
        item.original_id.toString() === subcategoryId,
    );
    return subcategory ? (subcategory as unknown as DetailRecord) : null;
  }, [categories, selectedMainCategory, subcategories, subcategoryId]);

  const handleMainCategoryChange = (value: string) => {
    setIsStyleLoaded(false);
    setStyleStatus("idle");
    setMainCategoryId(value);
    setSubcategoryId("");
  };

  const handleSubcategoryChange = (value: string) => {
    setIsStyleLoaded(false);
    setStyleStatus("loading");
    setSubcategoryId(value);
  };

  const handleImagesCountChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      // Reject 0
      if (value === "0") return;
      setImagesCount(value);
    }
  };

  React.useEffect(() => {
    if (!mainCategoryId || !subcategoryId) {
      setIsStyleLoaded(false);
      setStyleStatus("idle");
      return;
    }

    let cancelled = false;
    setIsStyleLoaded(false);
    setStyleStatus("loading");

    const query = new URLSearchParams({ mainCategoryId, subcategoryId });
    govaApi
      .get<ProductStyleResponse>(
        `${GOVA_API_ROUTES.dev.productStyle}?${query.toString()}`,
        { cache: "no-store" },
      )
      .then((response) => {
        if (cancelled) return;
        const images = response.settings?.components.images;
        const rating = response.settings?.components.rating;
        const price = response.settings?.components.price;
        const order = response.settings?.components.order;
        const mainData = response.settings?.components.mainData;
        const specifications = response.settings?.components.specifications;
        const vehicleSpecs = response.settings?.components.vehicleSpecs;
        const propertySpecs = response.settings?.components.propertySpecs;
        const pharmacySpecs = response.settings?.components.pharmacySpecs;
        setShowImages(images?.visible ?? true);
        setImagesCount(String(images?.count ?? 4));
        setImagesOrder(String(images?.order ?? 1));
        setRatingVisible(rating?.visible ?? true);
        setRatingType(rating?.type ?? "stars-comments");
        setRatingOrder(String(rating?.order ?? 2));
        setPriceVisible(price?.visible ?? true);
        setPriceCurrent(price?.current ?? true);
        setPriceBeforeDiscount(price?.beforeDiscount ?? true);
        setPriceNeedsCar(price?.needsCar ?? true);
        setPriceOrder(String(price?.order ?? 3));
        setOrderVisible(order?.visible ?? true);
        setOrderCart(order?.cart ?? true);
        setOrderFavorite(order?.favorite ?? true);
        setOrderContact(order?.contact ?? true);
        setOrderOrder(String(order?.order ?? 4));
        setMainDataVisible(mainData?.visible ?? true);
        setMainDataName(mainData?.name ?? true);
        setMainDataBrand(mainData?.brand ?? true);
        setMainDataManufacturer(mainData?.manufacturer ?? true);
        setMainDataAvailable(mainData?.available ?? true);
        setMainDataDescription(mainData?.description ?? true);
        setMainDataOrder(String(mainData?.order ?? 5));
        setSpecsVisible(specifications?.visible ?? true);
        setSpecsColor(specifications?.color ?? true);
        setSpecsDimensions(specifications?.dimensions ?? true);
        setSpecsCondition(specifications?.condition ?? true);
        setSpecsSize(specifications?.size ?? true);
        setSpecsWeight(specifications?.weight ?? true);
        setSpecsYear(specifications?.year ?? true);
        setSpecsOrder(String(specifications?.order ?? 6));
        setVehicleSpecsVisible(vehicleSpecs?.visible ?? false);
        setVehicleSpecsBrand(vehicleSpecs?.brand ?? true);
        setVehicleSpecsBodyType(vehicleSpecs?.bodyType ?? true);
        setVehicleSpecsFuel(vehicleSpecs?.fuel ?? true);
        setVehicleSpecsTransmission(vehicleSpecs?.transmission ?? true);
        setVehicleSpecsOrder(String(vehicleSpecs?.order ?? 7));
        setPropertySpecsVisible(propertySpecs?.visible ?? false);
        setPropertySpecsArea(propertySpecs?.area ?? true);
        setPropertySpecsRooms(propertySpecs?.rooms ?? true);
        setPropertySpecsBathrooms(propertySpecs?.bathrooms ?? true);
        setPropertySpecsType(propertySpecs?.type ?? true);
        setPropertySpecsAddress(propertySpecs?.address ?? true);
        setPropertySpecsLocation(propertySpecs?.location ?? true);
        setPropertySpecsFinishing(propertySpecs?.finishing ?? true);
        setPropertySpecsOrder(String(propertySpecs?.order ?? 8));
        setPharmacySpecsVisible(pharmacySpecs?.visible ?? false);
        setPharmacySpecsNameAr(pharmacySpecs?.nameAr ?? true);
        setPharmacySpecsNameEn(pharmacySpecs?.nameEn ?? true);
        setPharmacySpecsForm(pharmacySpecs?.form ?? true);
        setPharmacySpecsConcentration(pharmacySpecs?.concentration ?? true);
        setPharmacySpecsActiveIngredient(
          pharmacySpecs?.activeIngredient ?? true,
        );
        setPharmacySpecsOrder(String(pharmacySpecs?.order ?? 9));
        setIsStyleLoaded(true);
        setStyleStatus(response.exists ? "saved" : "idle");
      })
      .catch(() => {
        if (!cancelled) setStyleStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [mainCategoryId, subcategoryId]);

  React.useEffect(() => {
    if (!mainCategoryId || !subcategoryId || !isStyleLoaded) return;

    const timeout = window.setTimeout(() => {
      setStyleStatus("saving");
      const settings: ProductStyleSettings = {
        mainCategoryId,
        subcategoryId,
        components: {
          images: {
            visible: showImages,
            count: Number(imagesCount || 0),
            order: Number(imagesOrder || 1),
          },
          rating: {
            visible: ratingVisible,
            type: ratingType,
            order: Number(ratingOrder || 2),
          },
          price: {
            visible: priceVisible,
            current: priceCurrent,
            beforeDiscount: priceBeforeDiscount,
            needsCar: priceNeedsCar,
            order: Number(priceOrder || 3),
          },
          order: {
            visible: orderVisible,
            cart: orderCart,
            favorite: orderFavorite,
            contact: orderContact,
            order: Number(orderOrder || 4),
          },
          mainData: {
            visible: mainDataVisible,
            name: mainDataName,
            brand: mainDataBrand,
            manufacturer: mainDataManufacturer,
            available: mainDataAvailable,
            description: mainDataDescription,
            order: Number(mainDataOrder || 5),
          },
          specifications: {
            visible: specsVisible,
            color: specsColor,
            dimensions: specsDimensions,
            condition: specsCondition,
            size: specsSize,
            weight: specsWeight,
            year: specsYear,
            order: Number(specsOrder || 6),
          },
          vehicleSpecs: {
            visible: vehicleSpecsVisible,
            brand: vehicleSpecsBrand,
            bodyType: vehicleSpecsBodyType,
            fuel: vehicleSpecsFuel,
            transmission: vehicleSpecsTransmission,
            order: Number(vehicleSpecsOrder || 7),
          },
          propertySpecs: {
            visible: propertySpecsVisible,
            area: propertySpecsArea,
            rooms: propertySpecsRooms,
            bathrooms: propertySpecsBathrooms,
            type: propertySpecsType,
            address: propertySpecsAddress,
            location: propertySpecsLocation,
            finishing: propertySpecsFinishing,
            order: Number(propertySpecsOrder || 8),
          },
          pharmacySpecs: {
            visible: pharmacySpecsVisible,
            nameAr: pharmacySpecsNameAr,
            nameEn: pharmacySpecsNameEn,
            form: pharmacySpecsForm,
            concentration: pharmacySpecsConcentration,
            activeIngredient: pharmacySpecsActiveIngredient,
            order: Number(pharmacySpecsOrder || 9),
          },
        },
      };

      govaApi
        .put<{ saved: boolean }>(GOVA_API_ROUTES.dev.productStyle, settings)
        .then(() => setStyleStatus("saved"))
        .catch(() => setStyleStatus("error"));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    imagesCount,
    imagesOrder,
    isStyleLoaded,
    mainCategoryId,
    mainDataAvailable,
    mainDataBrand,
    mainDataDescription,
    mainDataManufacturer,
    mainDataName,
    mainDataOrder,
    mainDataVisible,
    orderCart,
    orderContact,
    orderFavorite,
    orderOrder,
    orderVisible,
    pharmacySpecsActiveIngredient,
    pharmacySpecsConcentration,
    pharmacySpecsForm,
    pharmacySpecsNameAr,
    pharmacySpecsNameEn,
    pharmacySpecsOrder,
    pharmacySpecsVisible,
    priceBeforeDiscount,
    priceCurrent,
    priceNeedsCar,
    priceOrder,
    priceVisible,
    propertySpecsAddress,
    propertySpecsArea,
    propertySpecsBathrooms,
    propertySpecsFinishing,
    propertySpecsLocation,
    propertySpecsOrder,
    propertySpecsRooms,
    propertySpecsType,
    propertySpecsVisible,
    ratingOrder,
    ratingType,
    ratingVisible,
    showImages,
    specsColor,
    specsCondition,
    specsDimensions,
    specsOrder,
    specsSize,
    specsVisible,
    specsWeight,
    specsYear,
    subcategoryId,
    vehicleSpecsBodyType,
    vehicleSpecsBrand,
    vehicleSpecsFuel,
    vehicleSpecsOrder,
    vehicleSpecsTransmission,
    vehicleSpecsVisible,
  ]);

  const previewComponents = [
    {
      key: "images",
      visible: showImages,
      order: Number(imagesOrder || 1),
      content: (
        <ProductImages
          mode={previewMode}
          maxImages={Number(imagesCount || 1)}
        />
      ),
    },
    {
      key: "rating",
      visible: ratingVisible,
      order: Number(ratingOrder || 2),
      content: (
        <ProductRating
          mode={previewMode}
          showComments={ratingType === "stars-comments"}
        />
      ),
    },
    {
      key: "price",
      visible: priceVisible,
      order: Number(priceOrder || 3),
      content: (
        <ProductPrice
          mode={previewMode}
          current={priceCurrent}
          beforeDiscount={priceBeforeDiscount}
          needsCar={priceNeedsCar}
        />
      ),
    },
    {
      key: "order",
      visible: orderVisible,
      order: Number(orderOrder || 4),
      content: (
        <ProductActions
          mode={previewMode}
          cart={orderCart}
          favorite={orderFavorite}
          contact={orderContact}
        />
      ),
    },
    {
      key: "main-data",
      visible: mainDataVisible,
      order: Number(mainDataOrder || 5),
      content: (
        <ProductMainData
          mode={previewMode}
          fields={{
            name: mainDataName,
            brand: mainDataBrand,
            manufacturer: mainDataManufacturer,
            available: mainDataAvailable,
            description: mainDataDescription,
          }}
        />
      ),
    },
    {
      key: "specifications",
      visible: specsVisible,
      order: Number(specsOrder || 6),
      content: (
        <ProductSpecifications
          mode={previewMode}
          fields={{
            color: specsColor,
            dimensions: specsDimensions,
            condition: specsCondition,
            size: specsSize,
            weight: specsWeight,
            year: specsYear,
          }}
        />
      ),
    },
    {
      key: "vehicle-specifications",
      visible: vehicleSpecsVisible,
      order: Number(vehicleSpecsOrder || 7),
      content: (
        <VehicleSpecifications
          mode={previewMode}
          fields={{
            brand: vehicleSpecsBrand,
            bodyType: vehicleSpecsBodyType,
            fuel: vehicleSpecsFuel,
            transmission: vehicleSpecsTransmission,
          }}
        />
      ),
    },
    {
      key: "property-specifications",
      visible: propertySpecsVisible,
      order: Number(propertySpecsOrder || 8),
      content: (
        <PropertySpecifications
          mode={previewMode}
          fields={{
            area: propertySpecsArea,
            rooms: propertySpecsRooms,
            bathrooms: propertySpecsBathrooms,
            type: propertySpecsType,
            address: propertySpecsAddress,
            location: propertySpecsLocation,
            finishing: propertySpecsFinishing,
          }}
        />
      ),
    },
    {
      key: "pharmacy-specifications",
      visible: pharmacySpecsVisible,
      order: Number(pharmacySpecsOrder || 9),
      content: (
        <PharmacySpecifications
          mode={previewMode}
          fields={{
            nameAr: pharmacySpecsNameAr,
            nameEn: pharmacySpecsNameEn,
            form: pharmacySpecsForm,
            concentration: pharmacySpecsConcentration,
            activeIngredient: pharmacySpecsActiveIngredient,
          }}
        />
      ),
    },
  ]
    .filter((component) => component.visible)
    .sort((left, right) => left.order - right.order);

  return (
    <main className="mx-auto w-full px-4 py-8 sm:px-6">
      <section className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
        <p className="mb-2 w-full text-xs font-semibold uppercase tracking-wider text-primary">
          Developer only
        </p>
        <h1 className="text-2xl font-bold">محدد التصنيفات</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          أداة لمراجعة العلاقة بين التصنيفات الرئيسية والفرعية.
        </p>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : loadError ? (
          <p className="mt-8 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
            تعذر تحميل بيانات التصنيفات.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">التصنيف الرئيسي</label>
              <Select
                value={mainCategoryId}
                onValueChange={handleMainCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر تصنيفًا رئيسيًا" />
                </SelectTrigger>
                <SelectContent>
                  {mainCategoryOptions.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {bilingualLabel(category.titleAr, category.titleEn)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">التصنيف الفرعي</label>
              <Select
                value={subcategoryId}
                onValueChange={handleSubcategoryChange}
                disabled={!mainCategoryId || subcategoryOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      mainCategoryId && subcategoryOptions.length === 0
                        ? "لا توجد تصنيفات فرعية"
                        : "اختر تصنيفًا فرعيًا"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subcategoryOptions.map((subcategory) => (
                    <SelectItem
                      key={subcategory.value}
                      value={subcategory.value}
                    >
                      {bilingualLabel(subcategory.titleAr, subcategory.titleEn)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <details className="group sm:col-span-2">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border bg-muted/40 px-4 py-3 font-semibold transition-colors hover:bg-muted/70">
                <span>معلومات العناصر المختارة</span>
                <span className="text-lg text-muted-foreground transition-transform group-open:rotate-180">
                  ⌄
                </span>
              </summary>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <SelectedRecordDetails
                  title="بيانات التصنيف الرئيسي"
                  record={selectedMainDetails}
                />
                <SelectedRecordDetails
                  title="بيانات التصنيف الفرعي"
                  record={selectedSubcategoryDetails}
                />
              </div>
            </details>

            {mainCategoryId && subcategoryId ? (
              <div className="overflow-hidden rounded-2xl border sm:col-span-2">
                <div className="border-b bg-muted/40 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold">إعدادات المكونات</h2>
                    <span className="text-xs text-muted-foreground">
                      {styleStatus === "loading" && "جارٍ تحميل الإعدادات…"}
                      {styleStatus === "saving" && "جارٍ الحفظ…"}
                      {styleStatus === "saved" && "تم الحفظ"}
                      {styleStatus === "error" && "تعذر الحفظ أو التحميل"}
                      {styleStatus === "idle" && "سيتم الحفظ تلقائيًا"}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table
                    data-voice-input="off"
                    className="w-full min-w-[560px] border-collapse text-sm"
                  >
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="w-24 border-b px-4 py-3 text-center font-semibold">
                          ظهور
                        </th>
                        <th className="w-40 border-b px-4 py-3 text-right font-semibold">
                          المكون
                        </th>
                        <th className="border-b px-4 py-3 text-right font-semibold">
                          التحكم
                        </th>
                        <th className="w-24 border-b px-4 py-3 text-right font-semibold">
                          ترتيب
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-background">
                        <td className="px-4 py-4 text-center align-middle">
                          <input
                            id="developer-component-images-visible"
                            type="checkbox"
                            checked={showImages}
                            onChange={(event) =>
                              setShowImages(event.target.checked)
                            }
                            disabled={!isStyleLoaded}
                            className="h-5 w-5 cursor-pointer accent-primary"
                            aria-label="إظهار مكون الصور"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle font-medium">
                          صور
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-wrap items-center gap-3">
                            <label
                              htmlFor="developer-images-count"
                              className="font-medium"
                            >
                              عدد الصور
                            </label>
                            <input
                              id="developer-images-count"
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              value={imagesCount}
                              onChange={handleImagesCountChange}
                              disabled={!isStyleLoaded}
                              onBlur={() => {
                                if (imagesCount === "") setImagesCount("4");
                              }}
                              className="gova-control gova-field-surface w-28 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={imagesOrder}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d+$/.test(value)) {
                                if (value === "0") return;
                                setImagesOrder(value);
                              }
                            }}
                            onBlur={() => {
                              if (imagesOrder === "") setImagesOrder("1");
                            }}
                            className="gova-control gova-field-surface w-20 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                      </tr>
                      <tr className="bg-background">
                        <td className="px-4 py-4 text-center align-middle">
                          <input
                            id="developer-component-rating-visible"
                            type="checkbox"
                            checked={ratingVisible}
                            onChange={(event) =>
                              setRatingVisible(event.target.checked)
                            }
                            disabled={!isStyleLoaded}
                            className="h-5 w-5 cursor-pointer accent-primary"
                            aria-label="تفعيل الظهور تلقائي للتقييم"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle font-medium">
                          التقييم
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="rating-type"
                                value="stars"
                                checked={ratingType === "stars"}
                                onChange={() => setRatingType("stars")}
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">نجوم فقط</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="rating-type"
                                value="stars-comments"
                                checked={ratingType === "stars-comments"}
                                onChange={() => setRatingType("stars-comments")}
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">نجوم وتعليقات</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={ratingOrder}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d+$/.test(value)) {
                                if (value === "0") return;
                                setRatingOrder(value);
                              }
                            }}
                            onBlur={() => {
                              if (ratingOrder === "") setRatingOrder("2");
                            }}
                            className="gova-control gova-field-surface w-20 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                      </tr>
                      <tr className="bg-background">
                        <td className="px-4 py-4 text-center align-middle">
                          <input
                            id="developer-component-price-visible"
                            type="checkbox"
                            checked={priceVisible}
                            onChange={(event) =>
                              setPriceVisible(event.target.checked)
                            }
                            disabled={!isStyleLoaded}
                            className="h-5 w-5 cursor-pointer accent-primary"
                            aria-label="تفعيل الظهور تلقائي للسعر"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle font-medium">
                          السعر
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={priceCurrent}
                                onChange={(e) =>
                                  setPriceCurrent(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">السعر الحالي</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={priceBeforeDiscount}
                                onChange={(e) =>
                                  setPriceBeforeDiscount(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">قبل الخصم</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={priceNeedsCar}
                                onChange={(e) =>
                                  setPriceNeedsCar(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">يحتاج سيارة</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={priceOrder}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d+$/.test(value)) {
                                if (value === "0") return;
                                setPriceOrder(value);
                              }
                            }}
                            disabled={!isStyleLoaded}
                            onBlur={() => {
                              if (priceOrder === "") setPriceOrder("3");
                            }}
                            className="gova-control gova-field-surface w-20 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                      </tr>
                      <tr className="bg-background">
                        <td className="px-4 py-4 text-center align-middle">
                          <input
                            id="developer-component-order-visible"
                            type="checkbox"
                            checked={orderVisible}
                            onChange={(event) =>
                              setOrderVisible(event.target.checked)
                            }
                            disabled={!isStyleLoaded}
                            className="h-5 w-5 cursor-pointer accent-primary"
                            aria-label="تفعيل الظهور تلقائي للطلب"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle font-medium">
                          الطلب
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={orderCart}
                                onChange={(e) => setOrderCart(e.target.checked)}
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">السلة</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={orderFavorite}
                                onChange={(e) =>
                                  setOrderFavorite(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">المفضلة</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={orderContact}
                                onChange={(e) =>
                                  setOrderContact(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">
                                تواصل مع مقدم الخدمة
                              </span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={orderOrder}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d+$/.test(value)) {
                                if (value === "0") return;
                                setOrderOrder(value);
                              }
                            }}
                            onBlur={() => {
                              if (orderOrder === "") setOrderOrder("4");
                            }}
                            className="gova-control gova-field-surface w-20 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                      </tr>
                      <tr className="bg-background">
                        <td className="px-4 py-4 text-center align-middle">
                          <input
                            id="developer-component-maindata-visible"
                            type="checkbox"
                            checked={mainDataVisible}
                            onChange={(event) =>
                              setMainDataVisible(event.target.checked)
                            }
                            disabled={!isStyleLoaded}
                            className="h-5 w-5 cursor-pointer accent-primary"
                            aria-label="تفعيل الظهور تلقائي لبيانات رئيسية"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle font-medium">
                          بيانات رئيسية
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mainDataName}
                                onChange={(e) =>
                                  setMainDataName(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">الاسم</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mainDataBrand}
                                onChange={(e) =>
                                  setMainDataBrand(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">العلامة التجارية</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mainDataManufacturer}
                                onChange={(e) =>
                                  setMainDataManufacturer(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">الشركة المصنعة</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mainDataAvailable}
                                onChange={(e) =>
                                  setMainDataAvailable(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">متوفر</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={mainDataDescription}
                                onChange={(e) =>
                                  setMainDataDescription(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">وصف</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={mainDataOrder}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d+$/.test(value)) {
                                if (value === "0") return;
                                setMainDataOrder(value);
                              }
                            }}
                            onBlur={() => {
                              if (mainDataOrder === "") setMainDataOrder("5");
                            }}
                            className="gova-control gova-field-surface w-20 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                      </tr>
                      <tr className="bg-background">
                        <td className="px-4 py-4 text-center align-middle">
                          <input
                            id="developer-component-specs-visible"
                            type="checkbox"
                            checked={specsVisible}
                            onChange={(event) =>
                              setSpecsVisible(event.target.checked)
                            }
                            disabled={!isStyleLoaded}
                            className="h-5 w-5 cursor-pointer accent-primary"
                            aria-label="تفعيل الظهور تلقائي لمواصفات عامة"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle font-medium">
                          مواصفات عامة
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={specsColor}
                                onChange={(e) =>
                                  setSpecsColor(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">اللون</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={specsDimensions}
                                onChange={(e) =>
                                  setSpecsDimensions(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">الأبعاد</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={specsCondition}
                                onChange={(e) =>
                                  setSpecsCondition(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">الحالة</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={specsSize}
                                onChange={(e) => setSpecsSize(e.target.checked)}
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">المقاس</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={specsWeight}
                                onChange={(e) =>
                                  setSpecsWeight(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">الوزن</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={specsYear}
                                onChange={(e) => setSpecsYear(e.target.checked)}
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">سنة الصنع</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={specsOrder}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d+$/.test(value)) {
                                if (value === "0") return;
                                setSpecsOrder(value);
                              }
                            }}
                            onBlur={() => {
                              if (specsOrder === "") setSpecsOrder("6");
                            }}
                            className="gova-control gova-field-surface w-20 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                      </tr>
                      <tr className="bg-background">
                        <td className="px-4 py-4 text-center align-middle">
                          <input
                            id="developer-component-vehiclespecs-visible"
                            type="checkbox"
                            checked={vehicleSpecsVisible}
                            onChange={(event) =>
                              setVehicleSpecsVisible(event.target.checked)
                            }
                            disabled={!isStyleLoaded}
                            className="h-5 w-5 cursor-pointer accent-primary"
                            aria-label="تفعيل الظهور تلقائي لمواصفات مركبة"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle font-medium">
                          مواصفات مركبة
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={vehicleSpecsBrand}
                                onChange={(e) =>
                                  setVehicleSpecsBrand(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">الماركة</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={vehicleSpecsBodyType}
                                onChange={(e) =>
                                  setVehicleSpecsBodyType(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">نوع الهيكل</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={vehicleSpecsFuel}
                                onChange={(e) =>
                                  setVehicleSpecsFuel(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">الوقود</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={vehicleSpecsTransmission}
                                onChange={(e) =>
                                  setVehicleSpecsTransmission(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">ناقل الحركة</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={vehicleSpecsOrder}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d+$/.test(value)) {
                                if (value === "0") return;
                                setVehicleSpecsOrder(value);
                              }
                            }}
                            onBlur={() => {
                              if (vehicleSpecsOrder === "")
                                setVehicleSpecsOrder("7");
                            }}
                            className="gova-control gova-field-surface w-20 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                      </tr>
                      <tr className="bg-background">
                        <td className="px-4 py-4 text-center align-middle">
                          <input
                            id="developer-component-propertyspecs-visible"
                            type="checkbox"
                            checked={propertySpecsVisible}
                            onChange={(event) =>
                              setPropertySpecsVisible(event.target.checked)
                            }
                            disabled={!isStyleLoaded}
                            className="h-5 w-5 cursor-pointer accent-primary"
                            aria-label="تفعيل الظهور تلقائي لمواصفات عقار"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle font-medium">
                          مواصفات عقار
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={propertySpecsArea}
                                onChange={(e) =>
                                  setPropertySpecsArea(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">المساحة</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={propertySpecsRooms}
                                onChange={(e) =>
                                  setPropertySpecsRooms(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">عدد الغرف</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={propertySpecsBathrooms}
                                onChange={(e) =>
                                  setPropertySpecsBathrooms(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">عدد الحمامات</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={propertySpecsType}
                                onChange={(e) =>
                                  setPropertySpecsType(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">نوع العقار</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={propertySpecsAddress}
                                onChange={(e) =>
                                  setPropertySpecsAddress(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">العنوان</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={propertySpecsLocation}
                                onChange={(e) =>
                                  setPropertySpecsLocation(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">الموقع</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={propertySpecsFinishing}
                                onChange={(e) =>
                                  setPropertySpecsFinishing(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">التشطيب</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={propertySpecsOrder}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d+$/.test(value)) {
                                if (value === "0") return;
                                setPropertySpecsOrder(value);
                              }
                            }}
                            onBlur={() => {
                              if (propertySpecsOrder === "")
                                setPropertySpecsOrder("8");
                            }}
                            className="gova-control gova-field-surface w-20 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                      </tr>
                      <tr className="bg-background">
                        <td className="px-4 py-4 text-center align-middle">
                          <input
                            id="developer-component-pharmacyspecs-visible"
                            type="checkbox"
                            checked={pharmacySpecsVisible}
                            onChange={(event) =>
                              setPharmacySpecsVisible(event.target.checked)
                            }
                            disabled={!isStyleLoaded}
                            className="h-5 w-5 cursor-pointer accent-primary"
                            aria-label="تفعيل الظهور تلقائي لمواصفات صيدلية"
                          />
                        </td>
                        <td className="px-4 py-4 align-middle font-medium">
                          مواصفات صيدلية
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pharmacySpecsNameAr}
                                onChange={(e) =>
                                  setPharmacySpecsNameAr(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">الاسم بالعربي</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pharmacySpecsNameEn}
                                onChange={(e) =>
                                  setPharmacySpecsNameEn(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">الاسم بالإنجليزي</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pharmacySpecsForm}
                                onChange={(e) =>
                                  setPharmacySpecsForm(e.target.checked)
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">شكل الدواء</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pharmacySpecsConcentration}
                                onChange={(e) =>
                                  setPharmacySpecsConcentration(
                                    e.target.checked,
                                  )
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">التركيز</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pharmacySpecsActiveIngredient}
                                onChange={(e) =>
                                  setPharmacySpecsActiveIngredient(
                                    e.target.checked,
                                  )
                                }
                                disabled={!isStyleLoaded}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className="text-sm">المادة الفعالة</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={pharmacySpecsOrder}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d+$/.test(value)) {
                                if (value === "0") return;
                                setPharmacySpecsOrder(value);
                              }
                            }}
                            onBlur={() => {
                              if (pharmacySpecsOrder === "")
                                setPharmacySpecsOrder("9");
                            }}
                            className="gova-control gova-field-surface w-20 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="border-t p-4 sm:p-6">
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["view", "عرض"],
                        ["edit", "تعديل"],
                        ["new", "جديد"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPreviewMode(mode)}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                          previewMode === mode
                            ? "border-primary bg-primary text-on-primary"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div
                    key={`${mainCategoryId}-${subcategoryId}-${previewMode}`}
                    className="mt-5 space-y-4 rounded-2xl bg-muted/20 p-3 sm:p-5"
                  >
                    {previewComponents.length > 0 ? (
                      previewComponents.map((component) => (
                        <React.Fragment key={component.key}>
                          {component.content}
                        </React.Fragment>
                      ))
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        لا توجد مكونات مفعّلة للعرض.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
