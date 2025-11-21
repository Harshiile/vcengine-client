import axios, { Method } from "axios"
import { toast } from "sonner"

interface RequestHandlerOptions {
    url: string
    method: Method
    body?: any
    action: Function
}

export const requestHandler = async ({
    url,
    method,
    body,
    action
}: RequestHandlerOptions) => {
    try {
        const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1${url}`
        const { data: { result } } = await axios(backendUrl, {
            method,
            data: body,
            withCredentials: true
        },)
        return await action(result);
    } catch (err: any) {
        const message =
            err.response?.data?.message || "Something went wrong. Please try again."
        toast.error(message, {
            style: {
                backgroundColor: "#2C0B0E",
                color: "#F8D7DA",
            },
        })
    }
}