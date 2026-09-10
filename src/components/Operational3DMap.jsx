import { Component, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Box, Building2, Layers3, Map as MapIcon, Rotate3D, Stethoscope, Users } from 'lucide-react'
import OperationalFloorPlan from './OperationalFloorPlan'

const areaPalette = ['#0f766e', '#0369a1', '#7c3aed', '#b45309', '#be123c', '#4d7c0f', '#475569']
const statusColors = { libre: '#22c55e', asignada: '#64748b', en_atencion: '#e11d48', fuera_servicio: '#94a3b8' }

// Salas reales que no son boxes de atención a pacientes: se muestran como espacios de referencia, no son agendables.
const nonClinicalSpaces = {
  'Cuidados Paliativos': ['Oficina', 'Comité oncológico', 'Sala de conversaciones'],
  'Unidad TACO': ['Oficina administrativa', 'Sala de charlas'],
  'Rehabilitación Pulmonar y Kine': ['Gimnasio'],
}

class MapErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <div className="border border-rose-200 bg-rose-50 p-6 text-sm text-rose-950"><p className="font-black">No se pudo abrir el mapa operativo.</p><p className="mt-2">Recargue la página. Si el problema persiste, vuelva a iniciar sesión.</p></div>
    }
    return this.props.children
  }
}

function roomLabel(box) {
  return box.especialidad?.nombre || 'Sin especialidad'
}

function displayAreaName(area) {
  return area === 'REHABILITACIÓN PULMONAR Y KINE' ? 'Rehabilitación pulmonar y kine' : area
}

function areaKey(area) {
  return (area || 'Sin área arquitectónica').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CL').trim()
}

function roomState(box) {
  if (box.estado === 'en_atencion') return 'en_atencion'
  if (box.estado === 'fuera_servicio') return 'fuera_servicio'
  if (box.tieneAsignado || box.asignado_medico_id) return 'asignada'
  return 'libre'
}

function staffInitials(name) {
  return name?.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || ''
}

function roomStatusLabel(box) {
  const state = roomState(box)
  const initials = staffInitials(box.medico)
  if (state === 'en_atencion') return `EN ATENCION${initials ? ` · ${initials}` : ''}`
  if (state === 'asignada') return `ASIGNADA${initials ? ` · ${initials}` : ''}`
  if (state === 'fuera_servicio') return 'FUERA DE SERVICIO'
  return 'LIBRE'
}

function createAreaLabel(text, color, compact = false) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const scale = Math.min(window.devicePixelRatio || 1, 4)
  const labelWidth = compact ? 360 : 640
  const labelHeight = compact ? 72 : 112
  canvas.width = labelWidth * scale
  canvas.height = labelHeight * scale
  context.scale(scale, scale)
  context.fillStyle = 'rgba(15, 23, 42, 0.92)'
  context.roundRect(0, 0, labelWidth, labelHeight, compact ? 12 : 18)
  context.fill()
  context.fillStyle = color
  context.fillRect(compact ? 14 : 22, compact ? 15 : 24, compact ? 7 : 10, compact ? 42 : 64)
  context.fillStyle = '#ffffff'
  context.font = compact ? '700 19px Arial' : '700 31px Arial'
  context.textBaseline = 'middle'
  context.fillText(text, compact ? 34 : 54, compact ? 36 : 56, compact ? 305 : 560)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }))
  sprite.scale.set(compact ? 2.35 : 4.5, compact ? 0.47 : 0.79, 1)
  return sprite
}

function createRoomBadge(roomNumber, compact = false) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const pixelRatio = 4
  const width = compact ? 240 : 360
  const height = compact ? 100 : 130
  canvas.width = width * pixelRatio
  canvas.height = height * pixelRatio
  context.scale(pixelRatio, pixelRatio)
  context.clearRect(0, 0, width, height)
  context.font = `900 ${compact ? 46 : 62}px Arial`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  context.lineWidth = compact ? 8 : 10
  context.strokeStyle = 'rgba(15, 23, 42, 0.88)'
  context.strokeText(roomNumber, width / 2, height / 2)
  context.fillStyle = '#ffffff'
  context.fillText(roomNumber, width / 2, height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(compact ? 0.66 : 0.82, compact ? 0.27 : 0.3),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
  )
  label.rotation.x = -Math.PI / 2
  return label
}

function createSpaceLabel(text) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const scale = Math.min(window.devicePixelRatio || 1, 4)
  const labelWidth = 320
  const labelHeight = 64
  canvas.width = labelWidth * scale
  canvas.height = labelHeight * scale
  context.scale(scale, scale)
  context.fillStyle = 'rgba(255, 255, 255, 0.96)'
  context.roundRect(0, 0, labelWidth, labelHeight, 10)
  context.fill()
  context.strokeStyle = '#94a3b8'
  context.lineWidth = 2
  context.roundRect(1, 1, labelWidth - 2, labelHeight - 2, 10)
  context.stroke()
  context.fillStyle = '#334155'
  context.font = '700 17px Arial'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, labelWidth / 2, labelHeight / 2, labelWidth - 20)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }))
  sprite.scale.set(1.55, 0.31, 1)
  return sprite
}

export default function Operational3DMap({ boxes, geometry = [], planUrl = null, onManageRoom, readOnly = false }) {
  const hostRef = useRef(null)
  const [selectedArea, setSelectedArea] = useState('Todas las áreas')
  const [selectedBoxId, setSelectedBoxId] = useState(null)
  const [mapMode, setMapMode] = useState('plano')
  const [viewMode, setViewMode] = useState('isometric')
  const selectedBoxIdRef = useRef(null)

  const areas = useMemo(() => [...new Set(boxes.map((box) => box.area || 'Sin área arquitectónica'))], [boxes])
  const visibleBoxes = useMemo(
    () => selectedArea === 'Todas las áreas'
      ? boxes
      : boxes.filter((box) => (box.area || 'Sin área arquitectónica') === selectedArea),
    [boxes, selectedArea]
  )
  const selectedBox = visibleBoxes.find((box) => box.id === selectedBoxId) || null
  const layoutSignature = `${visibleBoxes.map((box) => `${box.id}:${box.numero}:${box.area}:${box.estado}:${box.asignado_medico_id || ''}:${box.medico || ''}`).join('|')}|${geometry.map((item) => `${item.tipo}:${item.referencia}:${item.posicion_x}:${item.posicion_y}`).join('|')}`
  const usesProtectedGeometry = visibleBoxes.length > 0 && visibleBoxes.every((box) => geometry.some((item) => item.tipo === 'box' && item.referencia === box.numero))
  const available = visibleBoxes.filter((box) => roomState(box) === 'libre').length
  const assigned = visibleBoxes.filter((box) => roomState(box) === 'asignada').length
  const occupied = visibleBoxes.filter((box) => box.estado === 'en_atencion').length

  useEffect(() => {
    selectedBoxIdRef.current = selectedBoxId
  }, [selectedBoxId])

  useEffect(() => {
    if (mapMode !== '3d' || !hostRef.current) return undefined

    const host = hostRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#e8f0ef')

    const isMobileViewport = window.matchMedia('(max-width: 639px)').matches
    const isMobileOverview = isMobileViewport && selectedArea === 'Todas las áreas'
    const camera = isMobileOverview
      ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
      : new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(16, 20, 25)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = true
    controls.screenSpacePanning = true
    controls.panSpeed = 0.55
    controls.minDistance = 15
    controls.maxDistance = 42
    controls.minPolarAngle = 0.18
    controls.maxPolarAngle = Math.PI / 2 - 0.05
    controls.minAzimuthAngle = -Infinity
    controls.maxAzimuthAngle = Infinity
    if (isMobileViewport) {
      controls.touches.ONE = THREE.TOUCH.PAN
      controls.touches.TWO = THREE.TOUCH.DOLLY_PAN
    }

    const ambient = new THREE.HemisphereLight('#ffffff', '#78909c', 2.3)
    scene.add(ambient)
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.5)
    keyLight.position.set(12, 18, 8)
    keyLight.castShadow = true
    scene.add(keyLight)

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(38, 29), new THREE.MeshStandardMaterial({ color: '#d5e1df', roughness: 1 }))
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    if (!usesProtectedGeometry) {
      const corridor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.14, 2.4), new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9 }))
      corridor.position.set(0, 0.08, 0)
      corridor.receiveShadow = true
      scene.add(corridor)
    }

    const roomMeshes = []
    let panBounds = null
    const geometryByReference = new Map(geometry.map((item) => [item.referencia, item]))
    const scale = 0.012
    const geometricItems = geometry.filter((item) => ['sector', 'box', 'pasillo', 'espacio_neutro'].includes(item.tipo))
    const planCenterX = geometricItems.reduce((total, item) => total + Number(item.posicion_x), 0) / Math.max(geometricItems.length, 1)
    const planCenterY = geometricItems.reduce((total, item) => total + Number(item.posicion_y), 0) / Math.max(geometricItems.length, 1)
    const point = (item) => ({
      x: (Number(item.posicion_x) - planCenterX) * scale,
      z: (planCenterY - Number(item.posicion_y)) * scale
    })
    const activeAreas = new Set(visibleBoxes.map((box) => areaKey(box.area)))
    const activeSectors = geometry.filter((item) => item.tipo === 'sector' && activeAreas.has(areaKey(item.area)))
    const isDetailInActiveSector = (item) => {
      if (selectedArea === 'Todas las áreas') return true
      const itemX = Number(item.posicion_x)
      const itemY = Number(item.posicion_y)
      return activeSectors.some((sector) => {
        const halfWidth = Number(sector.ancho) / 2
        const halfDepth = Number(sector.largo) / 2
        return itemX >= Number(sector.posicion_x) - halfWidth && itemX <= Number(sector.posicion_x) + halfWidth && itemY >= Number(sector.posicion_y) - halfDepth && itemY <= Number(sector.posicion_y) + halfDepth
      })
    }
    const detailedBounds = new THREE.Box3()
    if (usesProtectedGeometry) {
      geometry.filter((item) => (item.tipo === 'pasillo' || item.tipo === 'espacio_neutro') && isDetailInActiveSector(item)).forEach((item) => {
        const position = point(item)
        const isCounter = item.referencia.startsWith('MOSTRADOR')
        const isClinicalCounter = item.referencia.startsWith('MESON')
        const isWaitingArea = item.referencia.startsWith('ESPERA')
        const isProcedureRoom = item.referencia.startsWith('BOX-PROC')
        const isRestroom = item.referencia.startsWith('SANITARIO')
        const surface = new THREE.Mesh(
          new THREE.BoxGeometry(Number(item.ancho) * scale, isCounter || isClinicalCounter ? 0.38 : isProcedureRoom ? 0.3 : 0.16, Number(item.largo) * scale),
          new THREE.MeshStandardMaterial({ color: item.tipo === 'pasillo' ? '#ffffff' : isCounter || isClinicalCounter ? '#64748b' : isProcedureRoom ? '#93c5fd' : isWaitingArea ? '#bae6fd' : isRestroom ? '#ffffff' : '#f8fafc', roughness: 0.88 })
        )
        surface.position.set(position.x, isCounter || isClinicalCounter ? 0.48 : isProcedureRoom ? 0.4 : 0.33, position.z)
        surface.rotation.y = THREE.MathUtils.degToRad(Number(item.rotacion) || 0)
        surface.receiveShadow = true
        scene.add(surface)
        surface.updateMatrixWorld(true)
        detailedBounds.expandByObject(surface)

        if (item.tipo === 'pasillo') {
          const edge = new THREE.LineSegments(
            new THREE.EdgesGeometry(surface.geometry),
            new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.9 })
          )
          edge.position.copy(surface.position)
          edge.rotation.copy(surface.rotation)
          scene.add(edge)
        }
      })
    }
    const grouped = visibleBoxes.reduce((result, box) => {
      const key = box.area || 'Sin área arquitectónica'
      ;(result[key] ||= []).push(box)
      return result
    }, {})
    const areaEntries = Object.entries(grouped)
    const columns = isMobileViewport ? Math.min(2, Math.max(1, areaEntries.length)) : Math.min(4, Math.max(1, areaEntries.length))
    const sceneBounds = new THREE.Box3()

    areaEntries.forEach(([area, areaBoxes], areaIndex) => {
      const gridX = areaIndex % columns
      const gridZ = Math.floor(areaIndex / columns)
      const areaSpacing = isMobileViewport ? 6.1 : 8.6
      const areaGeometry = geometry.find((item) => item.tipo === 'sector' && areaKey(item.area) === areaKey(area))
      const protectedPosition = areaGeometry ? point(areaGeometry) : null
      const originX = protectedPosition?.x ?? (gridX - (columns - 1) / 2) * areaSpacing
      const originZ = protectedPosition?.z ?? (gridZ - (Math.ceil(areaEntries.length / columns) - 1) / 2) * areaSpacing
      const color = areaPalette[areaIndex % areaPalette.length]
      const spaces = nonClinicalSpaces[area] || []
      const totalSlots = areaBoxes.length + spaces.length
      const layoutColumns = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(totalSlots))))
      const layoutRows = Math.ceil(totalSlots / layoutColumns)
      const footprintWidth = areaGeometry ? Number(areaGeometry.ancho) * scale : layoutColumns * 1.18 + 1.3
      const footprintDepth = areaGeometry ? Number(areaGeometry.largo) * scale : layoutRows * 1.18 + 1.3

      const sector = new THREE.Mesh(
        new THREE.BoxGeometry(footprintWidth, 0.38, footprintDepth),
        new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.28, roughness: 0.75 })
      )
      sector.position.set(originX, 0.19, originZ)
      sector.receiveShadow = true
      scene.add(sector)
      sector.updateMatrixWorld(true)
      sceneBounds.expandByObject(sector)
      if (usesProtectedGeometry) detailedBounds.expandByObject(sector)

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(footprintWidth, 0.4, footprintDepth)),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 })
      )
      outline.position.copy(sector.position)
      scene.add(outline)

      const corridorMaterial = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.95, metalness: 0.04 })
      if (!usesProtectedGeometry) {
        const accessCorridor = new THREE.Mesh(
          new THREE.BoxGeometry(footprintWidth + 0.7, 0.18, 0.72),
          corridorMaterial
        )
        accessCorridor.position.set(originX, 0.3, originZ + footprintDepth / 2 - 0.48)
        accessCorridor.receiveShadow = true
        scene.add(accessCorridor)

        const centralCorridor = new THREE.Mesh(
          new THREE.BoxGeometry(0.64, 0.19, footprintDepth - 0.45),
          corridorMaterial
        )
        centralCorridor.position.set(originX, 0.31, originZ - 0.1)
        centralCorridor.receiveShadow = true
        scene.add(centralCorridor)
      }

      if (!isMobileViewport || isMobileOverview) {
        const label = createAreaLabel(displayAreaName(area), color, isMobileViewport)
        label.position.set(originX, 1.55, originZ - footprintDepth / 2 - 0.55)
        scene.add(label)
      }

      areaBoxes.forEach((box, index) => {
        const column = index % layoutColumns
        const row = Math.floor(index / layoutColumns)
        const boxGeometry = geometryByReference.get(box.numero)
        const boxPosition = boxGeometry ? point(boxGeometry) : null
        const room = new THREE.Mesh(
          new THREE.BoxGeometry(0.82, 0.62, 0.82),
          new THREE.MeshStandardMaterial({ color: statusColors[roomState(box)], roughness: 0.45, metalness: 0.08, emissive: '#000000' })
        )
        room.position.set(boxPosition?.x ?? originX + (column - (layoutColumns - 1) / 2) * 1.18, 0.69, boxPosition?.z ?? originZ + (row - (layoutRows - 1) / 2) * 1.18)
        room.castShadow = true
        room.userData = { boxId: box.id }
        roomMeshes.push(room)
        scene.add(room)
        room.updateMatrixWorld(true)
        if (usesProtectedGeometry && boxGeometry) detailedBounds.expandByObject(room)

        const roomBadge = createRoomBadge(box.numero, isMobileViewport)
        roomBadge.position.set(room.position.x, 1.015, room.position.z)
        scene.add(roomBadge)
      })

      spaces.forEach((name, index) => {
        const slot = areaBoxes.length + index
        const column = slot % layoutColumns
        const row = Math.floor(slot / layoutColumns)
        const space = new THREE.Mesh(
          new THREE.BoxGeometry(0.82, 0.5, 0.82),
          new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9 })
        )
        space.position.set(originX + (column - (layoutColumns - 1) / 2) * 1.18, 0.6, originZ + (row - (layoutRows - 1) / 2) * 1.18)
        space.castShadow = true
        scene.add(space)
        space.updateMatrixWorld(true)
        if (usesProtectedGeometry) detailedBounds.expandByObject(space)
        sceneBounds.expandByObject(space)

        const edge = new THREE.LineSegments(
          new THREE.EdgesGeometry(space.geometry),
          new THREE.LineBasicMaterial({ color: '#94a3b8' })
        )
        edge.position.copy(space.position)
        scene.add(edge)

        const spaceLabel = createSpaceLabel(name)
        spaceLabel.position.set(space.position.x, 0.98, space.position.z)
        scene.add(spaceLabel)
      })
    })

    const frameCamera = () => {
      const cameraBounds = usesProtectedGeometry && !detailedBounds.isEmpty() ? detailedBounds : sceneBounds
      const center = cameraBounds.getCenter(new THREE.Vector3())
      const size = cameraBounds.getSize(new THREE.Vector3())
      const { width, height } = host.getBoundingClientRect()
      const aspect = width / Math.max(height, 1)
      if (viewMode === 'top') {
        const viewHeight = Math.max(size.z * 1.35, size.x / Math.max(aspect, 0.1) * 1.35, 6)
        camera.fov = 35
        camera.position.set(center.x, viewHeight * 1.15, center.z)
        controls.target.copy(center)
        controls.enableRotate = false
        controls.minPolarAngle = 0
        controls.maxPolarAngle = 0
        controls.minAzimuthAngle = -Infinity
        controls.maxAzimuthAngle = Infinity
        controls.minDistance = Math.max(2.5, viewHeight * 0.38)
        controls.maxDistance = Math.max(12, viewHeight * 1.7)
        camera.updateProjectionMatrix()
        controls.update()
        return
      }
      controls.enableRotate = true
      controls.minPolarAngle = 0.18
      controls.maxPolarAngle = Math.PI / 2 - 0.05
      controls.minAzimuthAngle = -Infinity
      controls.maxAzimuthAngle = Infinity
      if (isMobileOverview) {
        const viewHeight = Math.max(size.z * 1.45, (size.x / Math.max(aspect, 0.1)) * 1.3, 8)
        const halfHeight = viewHeight / 2
        camera.left = -halfHeight * aspect
        camera.right = halfHeight * aspect
        camera.top = halfHeight
        camera.bottom = -halfHeight
        camera.position.set(center.x + viewHeight * 0.62, viewHeight * 1.05, center.z + viewHeight * 0.62)
        controls.target.copy(center)
        panBounds = { center, size, padding: Math.max(size.x, size.z) * 0.24 }
        camera.updateProjectionMatrix()
        controls.update()
        return
      }
      const verticalFov = THREE.MathUtils.degToRad(width < 640 ? 52 : 40)
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect)
      const fitHeight = Math.max(size.z, 1) / (2 * Math.tan(verticalFov / 2))
      const fitWidth = Math.max(size.x, 1) / (2 * Math.tan(horizontalFov / 2))
      const mobileDistanceMultiplier = selectedArea === 'Todas las áreas' ? 1.45 : 1.12
      const distance = Math.max(fitHeight, fitWidth) * (width < 640 ? mobileDistanceMultiplier : 1.22)
      camera.fov = THREE.MathUtils.radToDeg(verticalFov)
      camera.position.set(center.x + distance * 0.55, center.y + distance * 1.18, center.z + distance * 0.6)
      controls.target.set(center.x, center.y, center.z)
      controls.minDistance = Math.max(2.5, distance * 0.18)
      controls.maxDistance = Math.max(12, distance * 1.6)
      camera.updateProjectionMatrix()
      controls.update()

      panBounds = { center, size, padding: Math.max(size.x, size.z) * 0.32 }
    }

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pointerDown = null
    const onPointerDown = (event) => { pointerDown = { x: event.clientX, y: event.clientY } }
    const onPointerUp = (event) => {
      if (!pointerDown || Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 6) return
      const bounds = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(roomMeshes, false)[0]
      if (hit) setSelectedBoxId(hit.object.userData.boxId)
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)

    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      frameCamera()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    let animationFrame
    let focusedBoxId = null
    let focusFramesRemaining = 0
    const animate = () => {
      animationFrame = requestAnimationFrame(animate)
      if (panBounds) {
        const { center, size, padding } = panBounds
        controls.target.x = THREE.MathUtils.clamp(controls.target.x, center.x - size.x / 2 - padding, center.x + size.x / 2 + padding)
        controls.target.z = THREE.MathUtils.clamp(controls.target.z, center.z - size.z / 2 - padding * 0.35, center.z + size.z / 2 + padding * 0.35)
      }
      roomMeshes.forEach((mesh) => {
        const selected = mesh.userData.boxId === selectedBoxIdRef.current
        mesh.material.emissive.set(selected ? '#facc15' : '#000000')
        mesh.material.emissiveIntensity = selected ? 0.45 : 0
        mesh.scale.setScalar(selected ? 1.18 : 1)
      })
      if (selectedBoxIdRef.current !== focusedBoxId) {
        focusedBoxId = selectedBoxIdRef.current
        focusFramesRemaining = focusedBoxId ? 28 : 0
      }
      if (focusFramesRemaining > 0) {
        const selectedRoom = roomMeshes.find((mesh) => mesh.userData.boxId === focusedBoxId)
        if (selectedRoom) {
          const cameraDirection = camera.position.clone().sub(controls.target).normalize()
          const targetPosition = selectedRoom.position.clone()
          const desiredPosition = targetPosition.clone().add(cameraDirection.multiplyScalar(4.8))
          camera.position.lerp(desiredPosition, 0.16)
          controls.target.lerp(targetPosition, 0.2)
        }
        focusFramesRemaining -= 1
      }
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      controls.dispose()
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => {
            if (material.map) material.map.dispose()
            material.dispose()
          })
        }
      })
      renderer.dispose()
      renderer.forceContextLoss()
      host.removeChild(renderer.domElement)
    }
  }, [layoutSignature, selectedArea, viewMode, mapMode])

  return (
    <section className="mx-auto mt-7 max-w-7xl" aria-label="Mapa operativo tridimensional">
      <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 bg-slate-950 px-5 py-5 text-white sm:px-7">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center bg-teal-500 text-slate-950"><Building2 size={22} /></div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-300">Centro de Referencia Ambulatorio</p>
              <h2 className="mt-1 text-xl font-black">Mapa operativo de salas</h2>
              <p className="mt-1 text-sm text-slate-300">Modelo operativo por áreas; no representa ni expone el plano arquitectónico.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-bold">
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />{available} disponibles</span>
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-slate-400" />{assigned} asignadas</span>
            <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-rose-400" />{occupied} en atención</span>
            <span className="inline-flex items-center gap-2"><Box size={15} />{visibleBoxes.length} salas</span>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 sm:px-7">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600" htmlFor="map-area-filter">Área del CR</label>
          <select id="map-area-filter" value={selectedArea} onChange={(event) => { setSelectedArea(event.target.value); setSelectedBoxId(null) }} className="min-w-64 border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
            <option value="Todas las áreas">Todas las áreas</option>
            {areas.map((area) => <option key={area} value={area}>{displayAreaName(area)}</option>)}
          </select>
          <p className="text-xs font-semibold text-slate-500">Seleccione un área para aislarla en el mapa.</p>
          <div className="ml-auto flex items-center gap-1 border border-slate-200 bg-white p-1">
            <button type="button" onClick={() => setMapMode('plano')} className={`flex h-8 w-8 items-center justify-center ${mapMode === 'plano' ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`} title="Plano operativo"><MapIcon size={16} /></button>
            <button type="button" onClick={() => setMapMode('3d')} className={`flex h-8 w-8 items-center justify-center ${mapMode === '3d' ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`} title="Modelo 3D navegable"><Rotate3D size={16} /></button>
            {mapMode === '3d' && <button type="button" onClick={() => setViewMode((current) => current === 'isometric' ? 'top' : 'isometric')} className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100" title="Alternar ángulo 3D"><Layers3 size={16} /></button>}
          </div>
        </div>

        {geometry.length === 0 && !readOnly && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-900 sm:px-7">
            No se pudo cargar la geometría protegida del plano. Verifique que la sesión tenga rol administrador y que la tabla plano_geometria contenga datos.
          </div>
        )}

        <MapErrorBoundary>
        {mapMode === 'plano' ? (
          <OperationalFloorPlan
            boxes={boxes}
            geometry={geometry}
            planUrl={planUrl}
            selectedArea={selectedArea}
            onSelectArea={(area) => { setSelectedArea(area); setSelectedBoxId(null) }}
            selectedBoxId={selectedBoxId}
            onSelectBox={setSelectedBoxId}
            onManageRoom={onManageRoom}
            readOnly={readOnly}
          />
        ) : <div className="grid overflow-hidden xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="relative min-w-0 overflow-hidden min-h-[26rem] bg-[#e8f0ef] sm:min-h-[34rem]">
            <div ref={hostRef} className="absolute inset-0 w-full h-full touch-none" />
            <div className="pointer-events-none absolute left-4 top-4 bg-slate-950/95 px-3 py-2 text-center text-white shadow-sm"><span className="block text-lg font-black text-teal-300">N</span><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">Norte</span></div>
            <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/85 px-2 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm"><Rotate3D size={13} className="text-teal-700" />Vista limitada · Pellizque para zoom</div>
          </div>
          <aside className="border-t border-slate-200 bg-white p-5 xl:border-l xl:border-t-0">
            <div className="mb-5 border-b border-slate-200 pb-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Áreas del modelo</p>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                {areas.map((area, index) => <button key={area} type="button" onClick={() => { setSelectedArea(area); setSelectedBoxId(null) }} className="flex min-w-0 items-center gap-2 text-left text-xs font-bold text-slate-700 hover:text-teal-800"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: areaPalette[index % areaPalette.length] }} /><span className="truncate">{displayAreaName(area)}</span></button>)}
              </div>
            </div>
            {selectedBox ? (
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-teal-700">Sala seleccionada</p>
                <h3 className="mt-1 text-3xl font-black text-slate-950">{selectedBox.numero}</h3>
                <p className="mt-1 text-sm font-bold text-slate-600">{displayAreaName(selectedBox.area || 'Sin área arquitectónica')}</p>
                <div className="mt-5 space-y-3 border-y border-slate-200 py-4 text-sm">
                  <p><span className="font-bold text-slate-500">Especialidad:</span><br />{roomLabel(selectedBox)}</p>
                  <p><span className="font-bold text-slate-500">Capacidad:</span><br />{selectedBox.capacidad || 1} cupo{Number(selectedBox.capacidad || 1) === 1 ? '' : 's'}</p>
                  <p><span className="font-bold text-slate-500">Estado:</span><br /><span className={roomState(selectedBox) === 'en_atencion' ? 'font-black text-rose-700' : roomState(selectedBox) === 'asignada' || roomState(selectedBox) === 'fuera_servicio' ? 'font-black text-slate-600' : 'font-black text-emerald-700'}>{roomStatusLabel(selectedBox).toLowerCase()}</span></p>
                  {selectedBox.medico && <p><span className="font-bold text-slate-500">Funcionario:</span><br />{readOnly ? staffInitials(selectedBox.medico) : selectedBox.medico}</p>}
                </div>
                {!readOnly && <button type="button" onClick={() => onManageRoom?.(selectedBox)} className="mt-5 flex w-full items-center justify-center gap-2 bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-800"><Stethoscope size={17} />Abrir para asignación</button>}
              </div>
            ) : (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <Users size={30} className="mx-auto text-teal-700" />
                  <h3 className="mt-3 text-lg font-black text-slate-900">Seleccione una sala</h3>
                  <p className="mt-2 text-sm text-slate-500">Cada módulo representa una sala del inventario y toma su color del estado en vivo.</p>
                </div>
              </div>
            )}
          </aside>
        </div>}
        </MapErrorBoundary>
      </div>
    </section>
  )
}