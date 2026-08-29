import { CreateAccountData, CreateAccountVariables, UpdateAccountData, UpdateAccountVariables, DeactivateAccountData, DeactivateAccountVariables, ReactivateAccountData, ReactivateAccountVariables, CreateReservationData, CreateReservationVariables, UpdateReservationData, UpdateReservationVariables, AddReservationDetailData, AddReservationDetailVariables, DeleteReservationDetailData, DeleteReservationDetailVariables, UpdateReservationStatusData, UpdateReservationStatusVariables, UpdateConfirmationContactData, UpdateConfirmationContactVariables, ClearConfirmationContactData, ClearConfirmationContactVariables, AssignStoreData, AssignStoreVariables, DeleteStoreAssignmentData, DeleteStoreAssignmentVariables, CreateReservationChangeRequestData, CreateReservationChangeRequestVariables, UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables, CreateStoreData, CreateStoreVariables, UpdateStoreData, UpdateStoreVariables, DeactivateStoreData, DeactivateStoreVariables, ReactivateStoreData, ReactivateStoreVariables, CreateMenuData, CreateMenuVariables, UpdateMenuData, UpdateMenuVariables, DeactivateMenuData, DeactivateMenuVariables, ReactivateMenuData, ReactivateMenuVariables, RecordVisitData, RecordVisitVariables, ListReservationsData, GetReservationData, GetReservationVariables, GetReservationByCodeData, GetReservationByCodeVariables, ListReservationChangeRequestsData, ListAccountsData, ListInactiveAccountsData, GetAccountByIdData, GetAccountByIdVariables, GetAccountByFirebaseUidData, GetAccountByFirebaseUidVariables, ListStoresData, ListInactiveStoresData, GetStoreByNameData, GetStoreByNameVariables, GetStoreByIdData, GetStoreByIdVariables, ListMenusData, ListInactiveMenusData, GetMenuByNameData, GetMenuByNameVariables, ListBillingRecordsData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateAccount(options?: useDataConnectMutationOptions<CreateAccountData, FirebaseError, CreateAccountVariables>): UseDataConnectMutationResult<CreateAccountData, CreateAccountVariables>;
export function useCreateAccount(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAccountData, FirebaseError, CreateAccountVariables>): UseDataConnectMutationResult<CreateAccountData, CreateAccountVariables>;

export function useUpdateAccount(options?: useDataConnectMutationOptions<UpdateAccountData, FirebaseError, UpdateAccountVariables>): UseDataConnectMutationResult<UpdateAccountData, UpdateAccountVariables>;
export function useUpdateAccount(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateAccountData, FirebaseError, UpdateAccountVariables>): UseDataConnectMutationResult<UpdateAccountData, UpdateAccountVariables>;

export function useDeactivateAccount(options?: useDataConnectMutationOptions<DeactivateAccountData, FirebaseError, DeactivateAccountVariables>): UseDataConnectMutationResult<DeactivateAccountData, DeactivateAccountVariables>;
export function useDeactivateAccount(dc: DataConnect, options?: useDataConnectMutationOptions<DeactivateAccountData, FirebaseError, DeactivateAccountVariables>): UseDataConnectMutationResult<DeactivateAccountData, DeactivateAccountVariables>;

export function useReactivateAccount(options?: useDataConnectMutationOptions<ReactivateAccountData, FirebaseError, ReactivateAccountVariables>): UseDataConnectMutationResult<ReactivateAccountData, ReactivateAccountVariables>;
export function useReactivateAccount(dc: DataConnect, options?: useDataConnectMutationOptions<ReactivateAccountData, FirebaseError, ReactivateAccountVariables>): UseDataConnectMutationResult<ReactivateAccountData, ReactivateAccountVariables>;

export function useCreateReservation(options?: useDataConnectMutationOptions<CreateReservationData, FirebaseError, CreateReservationVariables>): UseDataConnectMutationResult<CreateReservationData, CreateReservationVariables>;
export function useCreateReservation(dc: DataConnect, options?: useDataConnectMutationOptions<CreateReservationData, FirebaseError, CreateReservationVariables>): UseDataConnectMutationResult<CreateReservationData, CreateReservationVariables>;

export function useUpdateReservation(options?: useDataConnectMutationOptions<UpdateReservationData, FirebaseError, UpdateReservationVariables>): UseDataConnectMutationResult<UpdateReservationData, UpdateReservationVariables>;
export function useUpdateReservation(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateReservationData, FirebaseError, UpdateReservationVariables>): UseDataConnectMutationResult<UpdateReservationData, UpdateReservationVariables>;

export function useAddReservationDetail(options?: useDataConnectMutationOptions<AddReservationDetailData, FirebaseError, AddReservationDetailVariables>): UseDataConnectMutationResult<AddReservationDetailData, AddReservationDetailVariables>;
export function useAddReservationDetail(dc: DataConnect, options?: useDataConnectMutationOptions<AddReservationDetailData, FirebaseError, AddReservationDetailVariables>): UseDataConnectMutationResult<AddReservationDetailData, AddReservationDetailVariables>;

export function useDeleteReservationDetail(options?: useDataConnectMutationOptions<DeleteReservationDetailData, FirebaseError, DeleteReservationDetailVariables>): UseDataConnectMutationResult<DeleteReservationDetailData, DeleteReservationDetailVariables>;
export function useDeleteReservationDetail(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteReservationDetailData, FirebaseError, DeleteReservationDetailVariables>): UseDataConnectMutationResult<DeleteReservationDetailData, DeleteReservationDetailVariables>;

export function useUpdateReservationStatus(options?: useDataConnectMutationOptions<UpdateReservationStatusData, FirebaseError, UpdateReservationStatusVariables>): UseDataConnectMutationResult<UpdateReservationStatusData, UpdateReservationStatusVariables>;
export function useUpdateReservationStatus(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateReservationStatusData, FirebaseError, UpdateReservationStatusVariables>): UseDataConnectMutationResult<UpdateReservationStatusData, UpdateReservationStatusVariables>;

export function useUpdateConfirmationContact(options?: useDataConnectMutationOptions<UpdateConfirmationContactData, FirebaseError, UpdateConfirmationContactVariables>): UseDataConnectMutationResult<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;
export function useUpdateConfirmationContact(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateConfirmationContactData, FirebaseError, UpdateConfirmationContactVariables>): UseDataConnectMutationResult<UpdateConfirmationContactData, UpdateConfirmationContactVariables>;

export function useClearConfirmationContact(options?: useDataConnectMutationOptions<ClearConfirmationContactData, FirebaseError, ClearConfirmationContactVariables>): UseDataConnectMutationResult<ClearConfirmationContactData, ClearConfirmationContactVariables>;
export function useClearConfirmationContact(dc: DataConnect, options?: useDataConnectMutationOptions<ClearConfirmationContactData, FirebaseError, ClearConfirmationContactVariables>): UseDataConnectMutationResult<ClearConfirmationContactData, ClearConfirmationContactVariables>;

export function useAssignStore(options?: useDataConnectMutationOptions<AssignStoreData, FirebaseError, AssignStoreVariables>): UseDataConnectMutationResult<AssignStoreData, AssignStoreVariables>;
export function useAssignStore(dc: DataConnect, options?: useDataConnectMutationOptions<AssignStoreData, FirebaseError, AssignStoreVariables>): UseDataConnectMutationResult<AssignStoreData, AssignStoreVariables>;

export function useDeleteStoreAssignment(options?: useDataConnectMutationOptions<DeleteStoreAssignmentData, FirebaseError, DeleteStoreAssignmentVariables>): UseDataConnectMutationResult<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;
export function useDeleteStoreAssignment(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteStoreAssignmentData, FirebaseError, DeleteStoreAssignmentVariables>): UseDataConnectMutationResult<DeleteStoreAssignmentData, DeleteStoreAssignmentVariables>;

export function useCreateReservationChangeRequest(options?: useDataConnectMutationOptions<CreateReservationChangeRequestData, FirebaseError, CreateReservationChangeRequestVariables>): UseDataConnectMutationResult<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;
export function useCreateReservationChangeRequest(dc: DataConnect, options?: useDataConnectMutationOptions<CreateReservationChangeRequestData, FirebaseError, CreateReservationChangeRequestVariables>): UseDataConnectMutationResult<CreateReservationChangeRequestData, CreateReservationChangeRequestVariables>;

export function useUpdateReservationChangeRequestStatus(options?: useDataConnectMutationOptions<UpdateReservationChangeRequestStatusData, FirebaseError, UpdateReservationChangeRequestStatusVariables>): UseDataConnectMutationResult<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;
export function useUpdateReservationChangeRequestStatus(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateReservationChangeRequestStatusData, FirebaseError, UpdateReservationChangeRequestStatusVariables>): UseDataConnectMutationResult<UpdateReservationChangeRequestStatusData, UpdateReservationChangeRequestStatusVariables>;

export function useCreateStore(options?: useDataConnectMutationOptions<CreateStoreData, FirebaseError, CreateStoreVariables>): UseDataConnectMutationResult<CreateStoreData, CreateStoreVariables>;
export function useCreateStore(dc: DataConnect, options?: useDataConnectMutationOptions<CreateStoreData, FirebaseError, CreateStoreVariables>): UseDataConnectMutationResult<CreateStoreData, CreateStoreVariables>;

export function useUpdateStore(options?: useDataConnectMutationOptions<UpdateStoreData, FirebaseError, UpdateStoreVariables>): UseDataConnectMutationResult<UpdateStoreData, UpdateStoreVariables>;
export function useUpdateStore(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateStoreData, FirebaseError, UpdateStoreVariables>): UseDataConnectMutationResult<UpdateStoreData, UpdateStoreVariables>;

export function useDeactivateStore(options?: useDataConnectMutationOptions<DeactivateStoreData, FirebaseError, DeactivateStoreVariables>): UseDataConnectMutationResult<DeactivateStoreData, DeactivateStoreVariables>;
export function useDeactivateStore(dc: DataConnect, options?: useDataConnectMutationOptions<DeactivateStoreData, FirebaseError, DeactivateStoreVariables>): UseDataConnectMutationResult<DeactivateStoreData, DeactivateStoreVariables>;

export function useReactivateStore(options?: useDataConnectMutationOptions<ReactivateStoreData, FirebaseError, ReactivateStoreVariables>): UseDataConnectMutationResult<ReactivateStoreData, ReactivateStoreVariables>;
export function useReactivateStore(dc: DataConnect, options?: useDataConnectMutationOptions<ReactivateStoreData, FirebaseError, ReactivateStoreVariables>): UseDataConnectMutationResult<ReactivateStoreData, ReactivateStoreVariables>;

export function useCreateMenu(options?: useDataConnectMutationOptions<CreateMenuData, FirebaseError, CreateMenuVariables>): UseDataConnectMutationResult<CreateMenuData, CreateMenuVariables>;
export function useCreateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<CreateMenuData, FirebaseError, CreateMenuVariables>): UseDataConnectMutationResult<CreateMenuData, CreateMenuVariables>;

export function useUpdateMenu(options?: useDataConnectMutationOptions<UpdateMenuData, FirebaseError, UpdateMenuVariables>): UseDataConnectMutationResult<UpdateMenuData, UpdateMenuVariables>;
export function useUpdateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateMenuData, FirebaseError, UpdateMenuVariables>): UseDataConnectMutationResult<UpdateMenuData, UpdateMenuVariables>;

export function useDeactivateMenu(options?: useDataConnectMutationOptions<DeactivateMenuData, FirebaseError, DeactivateMenuVariables>): UseDataConnectMutationResult<DeactivateMenuData, DeactivateMenuVariables>;
export function useDeactivateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<DeactivateMenuData, FirebaseError, DeactivateMenuVariables>): UseDataConnectMutationResult<DeactivateMenuData, DeactivateMenuVariables>;

export function useReactivateMenu(options?: useDataConnectMutationOptions<ReactivateMenuData, FirebaseError, ReactivateMenuVariables>): UseDataConnectMutationResult<ReactivateMenuData, ReactivateMenuVariables>;
export function useReactivateMenu(dc: DataConnect, options?: useDataConnectMutationOptions<ReactivateMenuData, FirebaseError, ReactivateMenuVariables>): UseDataConnectMutationResult<ReactivateMenuData, ReactivateMenuVariables>;

export function useRecordVisit(options?: useDataConnectMutationOptions<RecordVisitData, FirebaseError, RecordVisitVariables>): UseDataConnectMutationResult<RecordVisitData, RecordVisitVariables>;
export function useRecordVisit(dc: DataConnect, options?: useDataConnectMutationOptions<RecordVisitData, FirebaseError, RecordVisitVariables>): UseDataConnectMutationResult<RecordVisitData, RecordVisitVariables>;

export function useListReservations(options?: useDataConnectQueryOptions<ListReservationsData>): UseDataConnectQueryResult<ListReservationsData, undefined>;
export function useListReservations(dc: DataConnect, options?: useDataConnectQueryOptions<ListReservationsData>): UseDataConnectQueryResult<ListReservationsData, undefined>;

export function useGetReservation(vars: GetReservationVariables, options?: useDataConnectQueryOptions<GetReservationData>): UseDataConnectQueryResult<GetReservationData, GetReservationVariables>;
export function useGetReservation(dc: DataConnect, vars: GetReservationVariables, options?: useDataConnectQueryOptions<GetReservationData>): UseDataConnectQueryResult<GetReservationData, GetReservationVariables>;

export function useGetReservationByCode(vars: GetReservationByCodeVariables, options?: useDataConnectQueryOptions<GetReservationByCodeData>): UseDataConnectQueryResult<GetReservationByCodeData, GetReservationByCodeVariables>;
export function useGetReservationByCode(dc: DataConnect, vars: GetReservationByCodeVariables, options?: useDataConnectQueryOptions<GetReservationByCodeData>): UseDataConnectQueryResult<GetReservationByCodeData, GetReservationByCodeVariables>;

export function useListReservationChangeRequests(options?: useDataConnectQueryOptions<ListReservationChangeRequestsData>): UseDataConnectQueryResult<ListReservationChangeRequestsData, undefined>;
export function useListReservationChangeRequests(dc: DataConnect, options?: useDataConnectQueryOptions<ListReservationChangeRequestsData>): UseDataConnectQueryResult<ListReservationChangeRequestsData, undefined>;

export function useListAccounts(options?: useDataConnectQueryOptions<ListAccountsData>): UseDataConnectQueryResult<ListAccountsData, undefined>;
export function useListAccounts(dc: DataConnect, options?: useDataConnectQueryOptions<ListAccountsData>): UseDataConnectQueryResult<ListAccountsData, undefined>;

export function useListInactiveAccounts(options?: useDataConnectQueryOptions<ListInactiveAccountsData>): UseDataConnectQueryResult<ListInactiveAccountsData, undefined>;
export function useListInactiveAccounts(dc: DataConnect, options?: useDataConnectQueryOptions<ListInactiveAccountsData>): UseDataConnectQueryResult<ListInactiveAccountsData, undefined>;

export function useGetAccountById(vars: GetAccountByIdVariables, options?: useDataConnectQueryOptions<GetAccountByIdData>): UseDataConnectQueryResult<GetAccountByIdData, GetAccountByIdVariables>;
export function useGetAccountById(dc: DataConnect, vars: GetAccountByIdVariables, options?: useDataConnectQueryOptions<GetAccountByIdData>): UseDataConnectQueryResult<GetAccountByIdData, GetAccountByIdVariables>;

export function useGetAccountByFirebaseUid(vars: GetAccountByFirebaseUidVariables, options?: useDataConnectQueryOptions<GetAccountByFirebaseUidData>): UseDataConnectQueryResult<GetAccountByFirebaseUidData, GetAccountByFirebaseUidVariables>;
export function useGetAccountByFirebaseUid(dc: DataConnect, vars: GetAccountByFirebaseUidVariables, options?: useDataConnectQueryOptions<GetAccountByFirebaseUidData>): UseDataConnectQueryResult<GetAccountByFirebaseUidData, GetAccountByFirebaseUidVariables>;

export function useListStores(options?: useDataConnectQueryOptions<ListStoresData>): UseDataConnectQueryResult<ListStoresData, undefined>;
export function useListStores(dc: DataConnect, options?: useDataConnectQueryOptions<ListStoresData>): UseDataConnectQueryResult<ListStoresData, undefined>;

export function useListInactiveStores(options?: useDataConnectQueryOptions<ListInactiveStoresData>): UseDataConnectQueryResult<ListInactiveStoresData, undefined>;
export function useListInactiveStores(dc: DataConnect, options?: useDataConnectQueryOptions<ListInactiveStoresData>): UseDataConnectQueryResult<ListInactiveStoresData, undefined>;

export function useGetStoreByName(vars: GetStoreByNameVariables, options?: useDataConnectQueryOptions<GetStoreByNameData>): UseDataConnectQueryResult<GetStoreByNameData, GetStoreByNameVariables>;
export function useGetStoreByName(dc: DataConnect, vars: GetStoreByNameVariables, options?: useDataConnectQueryOptions<GetStoreByNameData>): UseDataConnectQueryResult<GetStoreByNameData, GetStoreByNameVariables>;

export function useGetStoreById(vars: GetStoreByIdVariables, options?: useDataConnectQueryOptions<GetStoreByIdData>): UseDataConnectQueryResult<GetStoreByIdData, GetStoreByIdVariables>;
export function useGetStoreById(dc: DataConnect, vars: GetStoreByIdVariables, options?: useDataConnectQueryOptions<GetStoreByIdData>): UseDataConnectQueryResult<GetStoreByIdData, GetStoreByIdVariables>;

export function useListMenus(options?: useDataConnectQueryOptions<ListMenusData>): UseDataConnectQueryResult<ListMenusData, undefined>;
export function useListMenus(dc: DataConnect, options?: useDataConnectQueryOptions<ListMenusData>): UseDataConnectQueryResult<ListMenusData, undefined>;

export function useListInactiveMenus(options?: useDataConnectQueryOptions<ListInactiveMenusData>): UseDataConnectQueryResult<ListInactiveMenusData, undefined>;
export function useListInactiveMenus(dc: DataConnect, options?: useDataConnectQueryOptions<ListInactiveMenusData>): UseDataConnectQueryResult<ListInactiveMenusData, undefined>;

export function useGetMenuByName(vars: GetMenuByNameVariables, options?: useDataConnectQueryOptions<GetMenuByNameData>): UseDataConnectQueryResult<GetMenuByNameData, GetMenuByNameVariables>;
export function useGetMenuByName(dc: DataConnect, vars: GetMenuByNameVariables, options?: useDataConnectQueryOptions<GetMenuByNameData>): UseDataConnectQueryResult<GetMenuByNameData, GetMenuByNameVariables>;

export function useListBillingRecords(options?: useDataConnectQueryOptions<ListBillingRecordsData>): UseDataConnectQueryResult<ListBillingRecordsData, undefined>;
export function useListBillingRecords(dc: DataConnect, options?: useDataConnectQueryOptions<ListBillingRecordsData>): UseDataConnectQueryResult<ListBillingRecordsData, undefined>;
