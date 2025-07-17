{{- define "type_members" -}}
{{- $field := . -}}
{{- if eq $field.Name "metadata" -}}
Refer to Kubernetes API documentation for fields of &quot;metadata&quot;.
{{- else -}}
{{ markdownRenderFieldDoc $field.Doc | replace "\"" "&quot;" | replace "<--" "&lt;--" | replace "-->" "--&gt;" }}
{{- end -}}
{{- end -}}
