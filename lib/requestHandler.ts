import axios, { Method } from "axios"
import { toast } from "sonner"

interface RequestHandlerOptions<T> {
    url: string
    method: Method
    body?: object
    action: (data: T) => void | Promise<void>
}

export const requestHandler = async <T>({
    url,
    method,
    body,
    action
}: RequestHandlerOptions<T>) => {
    try {
        const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1${url}`
        const { data: { result } } = await axios(backendUrl, {
            method,
            data: body,
            withCredentials: true
        },)
        return await action(result);
    } catch (err) {
        console.log(err);
        // const message = err.response?.data?.message || "Something went wrong. Please try again."
        const message = "xxxxxxxxxxxxxxx"
        toast.error(message, {
            style: {
                backgroundColor: "#2C0B0E",
                color: "#F8D7DA",
            },
        })
    }
}