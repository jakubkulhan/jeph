var request = {};

Object.defineProperties(request, {
	method: { value: "", enumerable: true },
	url: { value: "", enumerable: true },
	query: { value: {}, enumerable: true },
	body: { value: {}, enumerable: true },
	basePath: { value: "", enumerable: true },
	headers: { value: {}, enumerable: true },
	httpVersion: { value: "", enumerable: true }
});

exports = request;
