/**
 * @template T
 */
class ApiResponse {
  /**
   * @param {T | null} data
   * @param {boolean} success
   * @param {string} msg
   */
  constructor(data = null, success = true, msg = "Success") {
    this.data = data;
    this.success = success;
    this.msg = msg;
  }

  /**
   * @template U
   * @param {U | null} data
   * @param {string} msg
   * @returns {ApiResponse<U>}
   */
  static ok(data = null, msg = "Success") {
    return new ApiResponse(data, true, msg);
  }

  /**
   * @param {string} msg
   * @param {null} data
   * @returns {ApiResponse<null>}
   */
  static fail(msg = "Error", data = null) {
    return new ApiResponse(data, false, msg);
  }
}

module.exports = ApiResponse;
