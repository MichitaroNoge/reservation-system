import { CreateCustomerData, CreateCustomerVariables, UpdateCustomerData, UpdateCustomerVariables, DeactivateCustomerData, DeactivateCustomerVariables, CreateReservationData, CreateReservationVariables, AddReservationDetailData, AddReservationDetailVariables, DeleteReservationDetailData, DeleteReservationDetailVariables, UpdateReservationData, UpdateReservationVariables, UpdateReservationStatusData, UpdateReservationStatusVariables, UpdateConfirmationContactData, UpdateConfirmationContactVariables, AssignStoreData, AssignStoreVariables, DeleteStoreAssignmentData, DeleteStoreAssignmentVariables, UpdateStoreData, UpdateStoreVariables, DeactivateStoreData, DeactivateStoreVariables, CreateMenuData, CreateMenuVariables, UpdateMenuData, UpdateMenuVariables, DeactivateMenuData, DeactivateMenuVariables, RecordVisitData, RecordVisitVariables, ListReservationsData, GetReservationData, GetReservationVariables, GetReservationByCodeData, GetReservationByCodeVariables, ListCustomersData, GetCustomerByNameData, GetCustomerByNameVariables, ListStoresData, GetStoreByNameData, GetStoreByNameVariables, ListMenusData, GetMenuByNameData, GetMenuByNameVariables, ListBillingRecordsData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateCustomer(options?: useDataConnectMutationOptions<CreateCustomerData, FirebaseError, CreateCustomerVariables>): UseDataConnectMutationResult<CreateCustomerData, CreateCustomerVariables>;
export function useCreateCustomer(dc: DataConnect, options?: useDataConnectMutationOptions<CreateCustomerData, FirebaseError, CreateCustomerVariables>): UseDataConnectMutationResult<CreateCustomerData, CreateCustomerVariables>;

export function useUpdateCustomer(options?: useDataConnectMutationOptions<UpdateCustomerData, FirebaseError, UpdateCustomerVariables>): UseDataConnectMutationResult<UpdateCustomerData, UpdateCustomerVariables>;
export function useUpdateCustomer(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateCustomerData, FirebaseError, UpdateCustomerVariables>): UseDataConnectMutationResult<UpdateCustomerData, UpdateCustomerVariables>;

export function useDeactivateCustomer(options?: useDataConnectMutationOptions<DeactivateCustomerData, FirebaseError, DeactivateCustomerVariables>): UseDataConnectMutationResult<DeactivateCustomerData, DeactivateCustomerVariables>;
export function useDeactivateCustomer(dc: DataConnect, options?: useDataConnectMutationOptions<DeactivateCustomerData, FirebaseError, DeactivateCustomerVariables>): UseDataConnectMutationResult<DeactivateCustomerData, DeactivateCustomerVariables>;

export function useCreateReservation(options?: useDataConnectMutationOptions<CreateReservationData, FirebaseError, CreateReservationVariables>): UseDataConnectMutationResult<CreateReservationData, CreateReservationVariables>;
export function useCreateReservation(dc: DataConnect, options?: useDataConnectMutationOptions<CreateReservationData, FirebaseError, CreateReservationVariables>): UseDataConnectMutationResult<CreateReservationData, CreateReservationVariables>;

export function useAddReservationDetail(options?: useDataConnectMutationOptions<AddReservationDetailData, FirebaseError, AddReservationDetailVariables>): UseDataConnectMutationResult<AddReservationDetailData, AddReservationDetailVariables>;
export function useAddReservationDetail(dc: DataConnect, options?: useDataConnectMutationOptions<AddReservationDetailData, FirebaseError, AddReservationDetailVariables>): UseDataConnectMutationResult<AddReservationDetailData, AddReservationDetailVariables>;

export function useDeleteReservationDetail(options?: useDataConnectMutationOptions<DeleteReservationDetailData, FirebaseError, DeleteReservationDetailVariables>): UseDataConnectMutationResult<DeleteReservationDetailData, DeleteReservationDetailVariables>;
export function useDeleteReservationDetail(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteReservationDetailData, FirebaseError, DeleteReservationDetailVariables>): UseDataConnectMutationResult<DeleteReservationDetailData, DeleteReservationDetailVariables>;

export function useUpdateReservation(options?: useDataConnectMutationOptions<UpdateReservationData, FirebaseError, UpdateReservationVariables>): UseDataConnectMutationResult<UpdateReservationData, UpdateReservationVariables>;
export function useUpdateReservation(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateReservationData, FirebaseError, UpdateReservationVariables>): UseDataConnectMutationResult<UpdateReservationData, UpdateReservationVariables>;

export function useUpdateReservationStatus(options?: useDataConnectMutationOptions<UpdateReservationStatusData, FirebaseError, UpdateReservationStatusVariables>): UseDataConnectMutationResult<UpdateReservationStatusData, UpdateReservationStatusVariables>;
export function useUpdateReservationStatus(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateReservationStatusData, FirebaseError, UpdateReservationStatusVariables>): UseDataConnectMutationResult<UpdateReservationStatusData, UpdateReservationStatusVariables>;

export function useUpdateConfirmationContact(options?: useDataConnectMutationOptions<UpdateConfirmationContactData, FirebaseError, UpdateConfirmationContactVariables>): UseDataConnectMutationResult<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;
export function useUpdateConfirmationContact(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateConfirmationContactData, FirebaseError, UpdateConfirmationContactVariables>): UseDataConnectMutationResult<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;

export function useAssignStore(options?: useDataConnectMutationOptions<AssignStoreData, FirebaseError, AssignStoreVariables>): UseDataConnectMutationResult<AssignStoreData, AssignStoreVariables>;
export function useAssignStore(dc: DataConnect, options?: useDataConnectMutationOptions<AssignStoreData, FirebaseError, AssignStoreVariables>): UseDataConnectMutationResult<AssignStoreData, AssignStoreVariables>;

export function useDeleteStoreAssignment(options?: useDataConnectMutationOptions<DeleteStoreAssignmentData, FirebaseError, DeleteStoreAssignmentVariables>): UseDataConnectMutationResult<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;
export function useDeleteStoreAssignment(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteStoreAssignmentData, FirebaseError, DeleteStoreAssignmentVariables>): UseDataConnectMutationResult<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;

export function useUpdateStore(options?: useDataConnectMutationOptions<UpdateStoreData, FirebaseError, UpdateStoreVariables>): UseDataConnectMutationResult<UpdateStoreData, UpdateStoreVariables>;
export function useUpdateStore(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateStoreData, FirebaseError, UpdateStoreVariables>): UseDataConnectMutationResult<UpdateStoreData, UpdateStoreVariables>;

export function useDeactivateStore(options?: useDataConnectMutationOptions<DeactivateStoreData, FirebaseError, DeactivateStoreVariables>): UseDataConnectMutationResult<DeactivateStoreData, DeactivateStoreVariables>;
export function useDeactivateStore(dc: DataConnect, options?: useDataConnectMutationOptions<DeactivateStoreData, FirebaseError, DeactivateStoreVariables>): UseDataConnectMutationResult<DeactivateStoreData, DeactivateStoreVariables>;

export function useCreateMenu(options?: useDataConnectMutationOptions<CreateMenuData, FirebaseError, CreateMenuVariables>): UseDataConnectMutationResult<CreateMenuData, CreateMenuVariables>;
export function useCreateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMenuData, FirebaseError, CreateMenuVariables>): UseDataConnectMutationResult<CreateMenuData, CreateMenuVariables>;

export function useUpdateMenu(options?: useDataConnectMutationOptions<UpdateMenuData, FirebaseError, UpdateMenuVariables>): UseDataConnectMutationResult<UpdateMenuData, UpdateMenuVariables>;
export function useUpdateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateMenuData, FirebaseError, UpdateMenuVariables>): UseDataConnectMutationResult<UpdateMenuData, UpdateMenuVariables>;

export function useDeactivateMenu(options?: useDataConnectMutationOptions<DeactivateMenuData, FirebaseError, DeactivateMenuVariables>): UseDataConnectMutationResult<DeactivateMenuData, DeactivateMenuVariables>;
export function useDeactivateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<DeactivateMenuData, FirebaseError, DeactivateMenuVariables>): UseDataConnectMutationResult<DeactivateMenuData, DeactivateMenuVariables>;

export function useRecordVisit(options?: useDataConnectMutationOptions<RecordVisitData, FirebaseError, RecordVisitVariables>): UseDataConnectMutationResult<RecordVisitData, RecordVisitVariables>;
export function useRecordVisit(dc: DataConnect, options?: useDataConnectMutationOptions<RecordVisitData, FirebaseError, RecordVisitVariables>): UseDataConnectMutationResult<RecordVisitData, RecordVisitVariables>;

export function useListReservations(options?: useDataConnectQueryOptions<ListReservationsData>): UseDataConnectQueryResult<ListReservationsData, undefined>;
export function useListReservations(dc: DataConnect, options?: useDataConnectQueryOptions<ListReservationsData>): UseDataConnectQueryResult<ListReservationsData, undefined>;

export function useGetReservation(vars: GetReservationVariables, options?: useDataConnectQueryOptions<GetReservationData>): UseDataConnectQueryResult<GetReservationData, GetReservationVariables>;
export function useGetReservation(dc: DataConnect, vars: GetReservationVariables, options?: useDataConnectQueryOptions<GetReservationData>): UseDataConnectQueryResult<GetReservationData, GetReservationVariables>;

export function useGetReservationByCode(vars: GetReservationByCodeVariables, options?: useDataConnectQueryOptions<GetReservationByCodeData>): UseDataConnectQueryResult<GetReservationByCodeData, GetReservationByCodeVariables>;
export function useGetReservationByCode(dc: DataConnect, vars: GetReservationByCodeVariables, options?: useDataConnectQueryOptions<GetReservationByCodeData>): UseDataConnectQueryResult<GetReservationByCodeData, GetReservationByCodeVariables>;

export function useListCustomers(options?: useDataConnectQueryOptions<ListCustomersData>): UseDataConnectQueryResult<ListCustomersData, undefined>;
export function useListCustomers(dc: DataConnect, options?: useDataConnectQueryOptions<ListCustomersData>): UseDataConnectQueryResult<ListCustomersData, undefined>;

export function useGetCustomerByName(vars: GetCustomerByNameVariables, options?: useDataConnectQueryOptions<GetCustomerByNameData>): UseDataConnectQueryResult<GetCustomerByNameData, GetCustomerByNameVariables>;
export function useGetCustomerByName(dc: DataConnect, vars: GetCustomerByNameVariables, options?: useDataConnectQueryOptions<GetCustomerByNameData>): UseDataConnectQueryResult<GetCustomerByNameData, GetCustomerByNameVariables>;

export function useListStores(options?: useDataConnectQueryOptions<ListStoresData>): UseDataConnectQueryResult<ListStoresData, undefined>;
export function useListStores(dc: DataConnect, options?: useDataConnectQueryOptions<ListStoresData>): UseDataConnectQueryResult<ListStoresData, undefined>;

export function useGetStoreByName(vars: GetStoreByNameVariables, options?: useDataConnectQueryOptions<GetStoreByNameData>): UseDataConnectQueryResult<GetStoreByNameData, GetStoreByNameVariables>;
export function useGetStoreByName(dc: DataConnect, vars: GetStoreByNameVariables, options?: useDataConnectQueryOptions<GetStoreByNameData>): UseDataConnectQueryResult<GetStoreByNameData, GetStoreByNameVariables>;

export function useListMenus(options?: useDataConnectQueryOptions<ListMenusData>): UseDataConnectQueryResult<ListMenusData, undefined>;
export function useListMenus(dc: DataConnect, options?: useDataConnectQueryOptions<ListMenusData>): UseDataConnectQueryResult<ListMenusData, undefined>;

export function useGetMenuByName(vars: GetMenuByNameVariables, options?: useDataConnectQueryOptions<GetMenuByNameData>): UseDataConnectQueryResult<GetMenuByNameData, GetMenuByNameVariables>;
export function useGetMenuByName(dc: DataConnect, vars: GetMenuByNameVariables, options?: useDataConnectQueryOptions<GetMenuByNameData>): UseDataConnectQueryResult<GetMenuByNameData, GetMenuByNameVariables>;

export function useListBillingRecords(options?: useDataConnectQueryOptions<ListBillingRecordsData>): UseDataConnectQueryResult<ListBillingRecordsData, undefined>;
export function useListBillingRecords(dc: DataConnect, options?: useDataConnectQueryOptions<ListBillingRecordsData>): UseDataConnectQueryResult<ListBillingRecordsData, undefined>;
