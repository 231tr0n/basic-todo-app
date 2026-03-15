package com.example.todo.components;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class StartupComponent {
  @EventListener(ApplicationReadyEvent.class)
  public void applicationReadyEvent() {
    System.out.println("                                                          ");
    System.out.println("                                                          ");
    System.out.println("███████╗████████╗ █████╗ ██████╗ ████████╗███████╗██████╗ ");
    System.out.println("██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██╔══██╗");
    System.out.println("███████╗   ██║   ███████║██████╔╝   ██║   █████╗  ██║  ██║");
    System.out.println("╚════██║   ██║   ██╔══██║██╔══██╗   ██║   ██╔══╝  ██║  ██║");
    System.out.println("███████║   ██║   ██║  ██║██║  ██║   ██║   ███████╗██████╔╝");
    System.out.println("╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═════╝ ");
    System.out.println("                                                          ");
    System.out.println("                                                          ");
  }
}
