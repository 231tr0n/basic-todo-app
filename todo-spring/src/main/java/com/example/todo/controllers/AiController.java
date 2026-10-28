package com.example.todo.controllers;

import com.example.todo.configurations.TodoConfigurationProperties;
import jakarta.annotation.PreDestroy;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping(AiController.API_PREFIX)
@RequiredArgsConstructor
public class AiController {

  static final String API_PREFIX = "/api/ai";
  private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(120);

  private final TodoConfigurationProperties configurationProperties;
  private final HttpClient httpClient =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  @PreDestroy
  void closeHttpClient() {
    httpClient.close();
  }

  @RequestMapping("/**")
  public ResponseEntity<StreamingResponseBody> proxy(
      HttpServletRequest request, @RequestBody(required = false) byte[] body)
      throws IOException, InterruptedException {
    HttpRequest.Builder requestBuilder =
        HttpRequest.newBuilder(providerUri(request))
            .timeout(REQUEST_TIMEOUT)
            .method(
                request.getMethod(),
                body == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofByteArray(body));
    copyHeader(request, requestBuilder, HttpHeaders.AUTHORIZATION);
    copyHeader(request, requestBuilder, HttpHeaders.CONTENT_TYPE);
    copyHeader(request, requestBuilder, HttpHeaders.ACCEPT);
    // Stream the provider response as it arrives instead of buffering the whole body, so
    // server-sent event chunks from chat completions reach the browser immediately.
    HttpResponse<InputStream> response =
        httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofInputStream());
    ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.status(response.statusCode());
    response
        .headers()
        .firstValue(HttpHeaders.CONTENT_TYPE)
        .ifPresent(
            contentType -> responseBuilder.contentType(MediaType.parseMediaType(contentType)));
    return responseBuilder.body(output -> copyResponseBody(response.body(), output));
  }

  private static void copyResponseBody(InputStream source, OutputStream target) throws IOException {
    try (InputStream input = source) {
      byte[] buffer = new byte[8192];
      int read;
      while ((read = input.read(buffer)) != -1) {
        target.write(buffer, 0, read);
        target.flush();
      }
    }
  }

  private URI providerUri(HttpServletRequest request) {
    int prefixLength = request.getContextPath().length() + API_PREFIX.length();
    String path = request.getRequestURI().substring(prefixLength);
    String query = request.getQueryString();
    return URI.create(
        configurationProperties.getAi().getBaseUrl()
            + "/v1"
            + path
            + (query == null ? "" : "?" + query));
  }

  private static void copyHeader(
      HttpServletRequest request, HttpRequest.Builder builder, String header) {
    String value = request.getHeader(header);
    if (value != null) {
      builder.header(header, value);
    }
  }
}
