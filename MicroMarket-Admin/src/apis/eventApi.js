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
    getListEvents(data) {
        if (data) {
            const url = '/event?type=pending&page=' + data;
            return axiosClient.get(url);
        } else {
            const url = '/event?type=pending&page=1';
            return axiosClient.get(url);
        }
    },
    getListMyEvents(page, data) {
        if (data) {
            const url = '/event?type=all&page='+page + '&size_page=' + data;
            return axiosClient.get(url);
        } else {
            const url = '/event?type=all&page='+page;
            return axiosClient.get(url);
        }
    },
    getListMyEventsAdmin(page, data) {
        if (data) {
            const url = '/admin/my_event?&page=' + page + '&size_page=' + data;
            return axiosClient.get(url);
        } else {
            const url = '/admin/my_event&page=1';
            return axiosClient.get(url);
        }
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
            const url = '/event/management/list_event?type=organizing&page=' + data;
            return axiosClient.get(url);
        } else {
            const url = '/event/management/list_event?type=organizing&page=1';
            return axiosClient.get(url);
        }
    },
    listOrganizedEvent(data) {
        if (data) {
            const url = '/event/management/list_event?type=organized&page=' + data;
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
    deleteEvent(data) {
        const url = "/event/" + data;
        return axiosClient.delete(url);
    },
    uploadImage() {
        const url = "/upload/uploadfile";
        return axiosClient.post(url);
    },
    getAllEmailUser() {
        const url = '/user';
        return axiosClient.get(url);
    },
    generateEvent(data) {
        const url = '/event/' + data + '/generate_meeting';
        return axiosClient.get(url);
    },
    searchEventNamePending(data) {
        const url = '/event/search_name?page=1&size_page=4&search=' + data + '&status=0';
        return axiosClient.get(url);
    },
    searchEventNameApproval(data) {
        const url = '/event/search_name?page=1&size_page=4&search=' + data + '&status=2';
        return axiosClient.get(url);
    },
    searchEventNameReject(data) {
        const url = '/event/search_name?page=1&size_page=4&search=' + data + '&status=1';
        return axiosClient.get(url);
    },
    getDataEmail() {
        const url = '/email';
        return axiosClient.get(url);
    },
    getDataMyEmail() {
        const url = '/email_by_me';
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
    attendanceByQRCode() {
        const url = '/tokens/:code_qr/attendance_by_qr_code';
        return axiosClient.get(url);
    },
    showDetailQrCode(id) {
        const url = '/event/' + id + '/token/qr_code';
        return axiosClient.get(url);
    }
}

export default eventApi;