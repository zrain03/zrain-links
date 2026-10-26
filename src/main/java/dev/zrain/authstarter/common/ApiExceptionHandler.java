
package dev.zrain.authstarter.common;

import dev.zrain.authstarter.auth.EmailAlreadyRegisteredException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validation(HttpServletRequest req) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Check the supplied fields.", req);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> malformed(HttpServletRequest req) {
        return error(HttpStatus.BAD_REQUEST, "MALFORMED_JSON", "Request JSON is missing or invalid.", req);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> argument(IllegalArgumentException ex, HttpServletRequest req) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_INPUT", ex.getMessage(), req);
    }

    @ExceptionHandler(EmailAlreadyRegisteredException.class)
    public ResponseEntity<ApiError> duplicate(HttpServletRequest req) {
        return error(HttpStatus.CONFLICT, "EMAIL_ALREADY_REGISTERED", "Email is already registered.", req);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> invalidCredentials(HttpServletRequest req) {
        return error(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password.", req);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> status(ResponseStatusException ex, HttpServletRequest req) {
        HttpStatus http = HttpStatus.resolve(ex.getStatusCode().value());
        if (http == null) http = HttpStatus.INTERNAL_SERVER_ERROR;
        return error(http, "ACCOUNT_UNAVAILABLE", "Account is unavailable.", req);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> missing(HttpServletRequest req) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", "Resource not found.", req);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> method(HttpServletRequest req) {
        return error(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "HTTP method not allowed.", req);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiError> database(HttpServletRequest req) {
        return error(HttpStatus.SERVICE_UNAVAILABLE, "DATABASE_UNAVAILABLE", "Service temporarily unavailable.", req);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> unknown(HttpServletRequest req) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Unexpected server error.", req);
    }

    private ResponseEntity<ApiError> error(HttpStatus status, String code, String message, HttpServletRequest req) {
        return ResponseEntity.status(status).body(new ApiError(status.value(), code, message, req.getRequestURI()));
    }
}
