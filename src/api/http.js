function readAuthToken() {
  const token = localStorage.getItem('token') || ''
  if (!token || token.startsWith('mock-token-')) {
    return ''
  }
  return token
}

function buildQueryString(query = {}) {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return

    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== undefined && item !== null && item !== '') {
          params.append(key, String(item))
        }
      })
      return
    }

    params.append(key, String(value))
  })

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text ? { message: text } : null
}

export async function request(path, options = {}) {
  const token = readAuthToken()
  const queryString = buildQueryString(options.query)
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  }
  const response = await fetch(`${path}${queryString}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined
      ? undefined
      : typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
  })

  const result = await parseResponse(response)

  if (!response.ok) {
    throw new Error(result?.msg || result?.message || `接口请求失败（${response.status}）`)
  }

  if (result && typeof result === 'object' && 'code' in result) {
    if (result.code !== 200) {
      throw new Error(result.msg || result.message || '接口返回异常')
    }
    return result.data
  }

  return result
}

export function createJsonRequester(prefix) {
  return (path, options = {}) => request(`${prefix}${path}`, options)
}