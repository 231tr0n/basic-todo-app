package com.example.todo.controllers;

import com.example.todo.configurations.TodoConfigurationProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
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

@RestController
@RequestMapping(AiController.API_PREFIX)
@RequiredArgsConstructor
public class AiController {

  static final String API_PREFIX = "/api/ai";

  private final TodoConfigurationProperties configurationProperties;
  private final HttpClient httpClient =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  @RequestMapping("/**")
  public ResponseEntity<byte[]> proxy(
      HttpServletRequest request, @RequestBody(required = false) byte[] body)
      throws IOException, InterruptedException {
    HttpRequest.Builder requestBuilder =
        HttpRequest.newBuilder(providerUri(request))
            .method(
                request.getMethod(),
                body == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofByteArray(body));
    copyHeader(request, requestBuilder, HttpHeaders.AUTHORIZATION);
    copyHeader(request, requestBuilder, HttpHeaders.CONTENT_TYPE);
    copyHeader(request, requestBuilder, HttpHeaders.ACCEPT);

    HttpResponse<byte[]> response =
        httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofByteArray());
    ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.status(response.statusCode());
    response
        .headers()
        .firstValue(HttpHeaders.CONTENT_TYPE)
        .ifPresent(
            contentType -> responseBuilder.contentType(MediaType.parseMediaType(contentType)));
    return responseBuilder.body(response.body());
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
