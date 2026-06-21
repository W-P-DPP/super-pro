export class HttpStatus {
  public static readonly SUCCESS = 200;
  public static readonly CREATED = 201;
  public static readonly ACCEPTED = 202;
  public static readonly NO_CONTENT = 204;
  public static readonly PARTIAL_CONTENT = 206;
  public static readonly MOVED_PERM = 301;
  public static readonly SEE_OTHER = 303;
  public static readonly NOT_MODIFIED = 304;
  public static readonly BAD_REQUEST = 400;
  public static readonly UNAUTHORIZED = 401;
  public static readonly FORBIDDEN = 403;
  public static readonly NOT_FOUND = 404;
  public static readonly BAD_METHOD = 405;
  public static readonly CONFLICT = 409;
  public static readonly UNSUPPORTED_TYPE = 415;
  public static readonly REQUESTED_RANGE_NOT_SATISFIABLE = 416;
  public static readonly ERROR = 500;
  public static readonly NOT_IMPLEMENTED = 501;
  public static readonly WARN = 601;
}
