const DEFAULT_CONTACT_API_PATH = "/api/contact/submitMessage"

const normalizePath = (value) => {
    if(typeof value !== "string" || !value.trim())
        return DEFAULT_CONTACT_API_PATH

    return value.trim()
}

export const submitContactMessage = async (payload, apiPath = DEFAULT_CONTACT_API_PATH) => {
    const response = await fetch(normalizePath(apiPath), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })

    let body = null
    try {
        body = await response.json()
    } catch (error) {
        body = null
    }

    if(!response.ok || !body || body.code !== 200) {
        return {
            success: false,
            message: body?.msg || null
        }
    }

    return {
        success: true,
        message: body.msg || null,
        data: body.data || null
    }
}
