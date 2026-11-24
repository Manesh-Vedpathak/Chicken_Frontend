import axios from "axios";

const api = axios.create({

    baseURL:
        process.env.REACT_APP_API_URL ||
        "https://chicken-backend-fuyx.onrender.com",

    timeout: 120000,

    headers: {
        Accept: "application/json",
    },

});

// Add JWT token to every request
api.interceptors.request.use(

    (config) => {

        const token =
            localStorage.getItem("token");

        if (token) {

            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;

        }

        return config;

    },

    (error) => Promise.reject(error)

);

// Handle API errors
api.interceptors.response.use(

    (response) => response,

    (error) => {

        if (error.code === "ECONNABORTED") {

            error.message =
                "Server response timed out. Please try again.";

        } else if (!error.response) {

            error.message =
                "Unable to connect to the Chicken Backend.";

        }

        return Promise.reject(error);

    }

);

export default api;