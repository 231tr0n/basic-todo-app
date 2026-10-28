package com.example.todo.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateTodoDto {
  @JsonProperty(required = false)
  @Size(min = 1, max = 255)
  private String title;

  @JsonProperty(required = false)
  @Size(min = 1, max = 255)
  private String description;
}
