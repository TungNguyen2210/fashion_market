import axiosClient from './axiosClient';

const eventApi = {
    /*Danh sách api sự kiện */
    createEvent(data) {
        const url = '/event';
        return axiosClient.post(url, data);
    },
    getDetailEvent(id) {
        const url = '/event/' + id;
        return axiosClient.get(url);
    },
    joinEvent(data) {
        const url = '/event/' + data + '/take_part_in_event';
        return axiosClient.post(url);
    },
    cancelJoinEvent(data) {
        const url = '/event/' + data + '/take_part_in_event/cancel';
        return axiosClient.post(url);
    }
    ,
    getListEvents(data) {
        if (data) {
            const url = '/event/list?page=' + data + '&size_page=' + 6;
            return axiosClient.get(url);
        } else {
            const url = '/event/list?page=1&size_page=2000';
            return axiosClient.get(url);
        }
    },
    getListUpComing() {
        const data = {
            "date": { "start_at": "06-11-2021", "end_at": "08-20-2021" }
        }
        const url = '/event/event_comming';
        return axiosClient.post(url, data);

    },
    getListEventsApproved(data) {
        if (data) {
            const url = '/event?type=accept&page=' + data;
            return axiosClient.get(url);
        } else {
            const url = '/event?type=accept&page=1';
            return axiosClient.get(url);
        }
    },
    getListEventsReject(data) {
        if (data) {
            const url = '/event?type=cancel&page=' + data;
            return axiosClient.get(url);
        } else {
            const url = '/event?type=cancel&page=1';
            return axiosClient.get(url);
        }
    },
    getEventJoin() {
        const url = '/event/joined_event?page=1&size_page=2000';
        return axiosClient.get(url);
    },
    approveEvent(data) {
        const url = '/event/' + data + '/approve_event';
        return axiosClient.patch(url);
    },
    cancelEvent(data) {
        const url = '/event/' + data + '/cancel_event';
        return axiosClient.patch(url);
    },
    listOrganizingEvent(data) {
        if (data) {
            const url = '/event/management/list_event?type=organizing&page= ' + data;
            return axiosClient.get(url);
        } else {
            const url = '/event/management/list_event?type=organizing&page=1';
            return axiosClient.get(url);
        }
    },
    listOrganizedEvent(data) {
        if (data) {
            const url = '/event/management/list_event?type=organized&page= ' + data;
            return axiosClient.get(url);
        } else {
            const url = '/event/management/list_event?type=organized&page=1';
            return axiosClient.get(url);
        }
    },
    getEventDetailStudent(data) {
        const url = '/event/' + data + '/take_part_in_event/list_attendance';
        return axiosClient.get(url);
    },
    getTypeEvent() {
        const url = '/get_type_event';
        return axiosClient.get(url);
    },
    getSuggest() {
        const url = '/suggestion';
        return axiosClient.get(url);
    },

    /*Danh sách api QR code */
    createQRCode(id) {
        const url = '/event/' + id + '/token';
        return axiosClient.post(url);
    },
    getDetailQRCode() {
        const url = '/event/:event_id/token/qr_code';
        return axiosClient.get(url);
    },
    attendanceByQRCode(data) {
        const url = '/tokens/' + data + '/attendance_by_qr_code';
        return axiosClient.get(url);
    },
    showDetailQrCode(id) {
        const url = '/event/' + id + '/token/qr_code';
        return axiosClient.get(url);
    }
}

export default eventApi;